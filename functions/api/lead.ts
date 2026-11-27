/**
 * POST /api/lead
 *
 * Cloudflare Pages Function: cuando Aurora (el chatbot) obtiene el contacto de un
 * potencial cliente, avisa a Kadmiel por WhatsApp y/o correo.
 *
 * Canales (se usan todos los que estén configurados; basta con que uno funcione):
 *
 *  1) WhatsApp Business Cloud API (oficial de Meta)
 *       WHATSAPP_TOKEN          (secret)  token permanente de la app
 *       WHATSAPP_PHONE_ID       id del número de WhatsApp Business que ENVÍA
 *       WHATSAPP_TEMPLATE       (opcional) nombre de una plantilla aprobada con 3 variables
 *                               {{1}} nombre · {{2}} teléfono · {{3}} interés.
 *                               Es lo recomendado: sin plantilla, Meta solo entrega mensajes
 *                               de texto si usted escribió al número en las últimas 24 h.
 *       WHATSAPP_TEMPLATE_LANG  (opcional) default "es"
 *
 *  2) CallMeBot (simple, gratuito, para un número personal)
 *       CALLMEBOT_APIKEY        (secret)  se obtiene siguiendo https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 *  3) Correo con Resend (el mismo de /api/contact)
 *       RESEND_API_KEY, CONTACT_TO, CONTACT_FROM
 *
 *  Destino del aviso por WhatsApp:
 *       NOTIFY_WHATSAPP         número con código de país, solo dígitos (default 56962206148)
 */

interface Env {
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_ID?: string;
  WHATSAPP_TEMPLATE?: string;
  WHATSAPP_TEMPLATE_LANG?: string;
  CALLMEBOT_APIKEY?: string;
  NOTIFY_WHATSAPP?: string;
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
}

interface Context {
  request: Request;
  env: Env;
}

interface Lead {
  name: string;
  phone: string;
  email: string;
  interest: string[];
  messages: string[];
}

const DEFAULT_NOTIFY = '56962206148';
const DEFAULT_TO = 'contacto@kadmiel.cl';
const DEFAULT_FROM = 'Kadmiel Web <web@kadmiel.cl>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Una sola línea, sin caracteres de control ni espacios repetidos (exigido por las plantillas de WhatsApp). */
const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max) : '';

function list(v: unknown, items: number, max: number): string[] {
  return Array.isArray(v) ? v.map((x) => clean(x, max)).filter(Boolean).slice(0, items) : [];
}

/** Normaliza teléfonos chilenos: 9 1234 5678 → 56912345678. Devuelve '' si no parece válido. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  if (digits.length === 8) return `569${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return '';
}

function parseLead(raw: unknown): Lead | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const email = clean(o.email, 200).toLowerCase();
  return {
    name: clean(o.name, 80),
    phone: normalizePhone(clean(o.phone, 40)),
    email: EMAIL_RE.test(email) ? email : '',
    interest: list(o.interest, 8, 60),
    messages: list(o.messages, 8, 160),
  };
}

// Límite básico por IP (por instancia del Worker; frena el abuso casual sin base de datos)
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) hits.clear();
  return recent.length > 5;
}

const labelName = (l: Lead) => l.name || 'Sin nombre';
const labelInterest = (l: Lead) => (l.interest.length ? l.interest.join(', ') : 'Consulta general');

function buildText(l: Lead): string {
  const waLink = l.phone ? `https://wa.me/${l.phone}` : '';
  return [
    '🔔 Nuevo cliente potencial (Aurora · kadmiel.cl)',
    '',
    `Nombre: ${labelName(l)}`,
    l.phone ? `WhatsApp: +${l.phone}` : '',
    l.email ? `Correo: ${l.email}` : '',
    `Interés: ${labelInterest(l)}`,
    l.messages.length ? `\nSu conversación:\n${l.messages.map((m) => `• ${m}`).join('\n')}` : '',
    waLink ? `\nResponder: ${waLink}` : '',
  ]
    .filter((x) => x !== '')
    .join('\n');
}

async function viaCloudApi(env: Env, to: string, l: Lead): Promise<boolean> {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) return false;
  const message = env.WHATSAPP_TEMPLATE
    ? {
        type: 'template',
        template: {
          name: env.WHATSAPP_TEMPLATE,
          language: { code: env.WHATSAPP_TEMPLATE_LANG || 'es' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: labelName(l) },
                { type: 'text', text: l.phone ? `+${l.phone}` : l.email || 'No indicado' },
                { type: 'text', text: labelInterest(l).slice(0, 200) },
              ],
            },
          ],
        },
      }
    : { type: 'text', text: { preview_url: false, body: buildText(l) } };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, ...message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function viaCallMeBot(env: Env, to: string, l: Lead): Promise<boolean> {
  if (!env.CALLMEBOT_APIKEY) return false;
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(to)}` +
    `&text=${encodeURIComponent(buildText(l))}&apikey=${encodeURIComponent(env.CALLMEBOT_APIKEY)}`;
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function viaEmail(env: Env, l: Lead): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM || DEFAULT_FROM,
        to: [env.CONTACT_TO || DEFAULT_TO],
        ...(l.email ? { reply_to: l.email } : {}),
        subject: `Cliente potencial (Aurora): ${labelName(l)} — ${labelInterest(l)}`.slice(0, 150),
        text: buildText(l),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  const origin = request.headers.get('Origin');
  if (origin) {
    let host = '';
    try {
      host = new URL(origin).host;
    } catch {
      host = '';
    }
    if (host !== new URL(request.url).host) return json({ error: 'forbidden' }, 403);
  }
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    return json({ error: 'invalid' }, 400);
  }

  let lead: Lead | null = null;
  try {
    lead = parseLead(await request.json());
  } catch {
    lead = null;
  }
  // Un potencial cliente necesita al menos una forma de contacto
  if (!lead || (!lead.phone && !lead.email)) return json({ error: 'invalid' }, 400);

  if (limited(request.headers.get('CF-Connecting-IP') || 'unknown')) {
    return json({ error: 'rate_limited' }, 429);
  }

  const configured = Boolean(
    (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID) || env.CALLMEBOT_APIKEY || env.RESEND_API_KEY,
  );
  if (!configured) return json({ error: 'not_configured' }, 503);

  const to = (env.NOTIFY_WHATSAPP || DEFAULT_NOTIFY).replace(/\D/g, '');
  const results = await Promise.all([viaCloudApi(env, to, lead), viaCallMeBot(env, to, lead), viaEmail(env, lead)]);

  return results.some(Boolean) ? json({ ok: true }) : json({ error: 'send_failed' }, 502);
};

export const onRequest = async (): Promise<Response> =>
  new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
