/**
 * POST /api/contact
 *
 * Cloudflare Pages Function: recibe el formulario "Solicitar por correo" del
 * cotizador y lo envía a contacto@kadmiel.cl usando la API de Resend.
 *
 * Configuración (Cloudflare Pages → Settings → Variables and Secrets):
 *   RESEND_API_KEY  (secret, obligatorio)  API key de https://resend.com
 *   CONTACT_TO      (opcional)  destinatario; por defecto contacto@kadmiel.cl
 *   CONTACT_FROM    (opcional)  remitente; por defecto "Kadmiel Web <web@kadmiel.cl>"
 *                               El dominio kadmiel.cl debe estar verificado en Resend.
 *
 * Desarrollo local: crea un archivo `.dev.vars` (ya ignorado por git) con
 *   RESEND_API_KEY=re_xxx
 * y corre `npx wrangler pages dev dist` después de `npm run build`.
 *
 * Nota: los tipos están declarados a mano para no depender de
 * @cloudflare/workers-types y que `astro check` compile sin problemas.
 */

interface Env {
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
}

interface Context {
  request: Request;
  env: Env;
}

interface ModuleItem {
  name: string;
  price: number;
}

interface Payload {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  website: string;
  project: string;
  projectPrice: number;
  modules: ModuleItem[];
  total: number;
}

const DEFAULT_TO = 'contacto@kadmiel.cl';
const DEFAULT_FROM = 'Kadmiel Web <web@kadmiel.cl>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** Texto de una sola línea (evita saltos de línea en asunto/nombres). */
function oneLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n) : 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const clp = (n: number) => `$${n.toLocaleString('es-CL')} CLP`;

function parsePayload(raw: unknown): Payload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const modules: ModuleItem[] = Array.isArray(r.modules)
    ? r.modules.slice(0, 10).map((m): ModuleItem => {
        const item = (typeof m === 'object' && m !== null ? m : {}) as Record<string, unknown>;
        return { name: oneLine(str(item.name, 80)), price: num(item.price) };
      })
    : [];

  return {
    name: oneLine(str(r.name, 100)),
    email: oneLine(str(r.email, 150)),
    phone: oneLine(str(r.phone, 30)),
    company: oneLine(str(r.company, 120)),
    message: str(r.message, 2000),
    website: str(r.website, 200),
    project: oneLine(str(r.project, 80)),
    projectPrice: num(r.projectPrice),
    modules,
    total: num(r.total),
  };
}

function buildText(p: Payload): string {
  const lines = [
    'Nueva solicitud de cotización desde kadmiel.cl',
    '',
    `Proyecto: ${p.project || '—'} (${clp(p.projectPrice)})`,
  ];
  if (p.modules.length > 0) {
    lines.push('Módulos adicionales:');
    p.modules.forEach((m) => lines.push(`  - ${m.name}: ${clp(m.price)}`));
  } else {
    lines.push('Sin módulos adicionales');
  }
  lines.push(`Total estimado: ${clp(p.total)}`, '', '--- Contacto ---', `Nombre: ${p.name}`, `Correo: ${p.email}`);
  if (p.phone) lines.push(`Teléfono: ${p.phone}`);
  if (p.company) lines.push(`Empresa / proyecto: ${p.company}`);
  if (p.message) lines.push('', 'Mensaje:', p.message);
  lines.push('', '(Los valores de la cotización los informa el formulario del visitante.)');
  return lines.join('\n');
}

function buildHtml(p: Payload): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;color:#0f172a">${value}</td></tr>`;

  const modules =
    p.modules.length > 0
      ? `<ul style="margin:0;padding-left:18px">${p.modules
          .map((m) => `<li>${escapeHtml(m.name)}: ${escapeHtml(clp(m.price))}</li>`)
          .join('')}</ul>`
      : 'Sin módulos adicionales';

  return `<!doctype html>
<html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a">
  <h2 style="margin:0 0 4px">Nueva solicitud de cotización</h2>
  <p style="margin:0 0 16px;color:#64748b">Enviada desde el cotizador de kadmiel.cl</p>
  <table style="border-collapse:collapse">
    ${row('Proyecto', `${escapeHtml(p.project || '—')} (${escapeHtml(clp(p.projectPrice))})`)}
    ${row('Módulos', modules)}
    ${row('Total estimado', `<strong>${escapeHtml(clp(p.total))}</strong>`)}
    ${row('Nombre', escapeHtml(p.name))}
    ${row('Correo', `<a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a>`)}
    ${p.phone ? row('Teléfono', escapeHtml(p.phone)) : ''}
    ${p.company ? row('Empresa / proyecto', escapeHtml(p.company)) : ''}
    ${p.message ? row('Mensaje', escapeHtml(p.message).replace(/\n/g, '<br>')) : ''}
  </table>
  <p style="margin-top:20px;color:#94a3b8;font-size:12px">Puedes responder directamente a este correo: la respuesta irá al cliente. Los valores de la cotización los informa el formulario del visitante.</p>
</body></html>`;
}

export const onRequestPost = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  // Solo desde el propio sitio (evita que otros orígenes usen el endpoint)
  const origin = request.headers.get('Origin');
  if (origin) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = '';
    }
    if (originHost !== new URL(request.url).host) {
      return json({ error: 'forbidden' }, 403);
    }
  }

  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    return json({ error: 'invalid' }, 400);
  }

  let payload: Payload | null = null;
  try {
    payload = parsePayload(await request.json());
  } catch {
    payload = null;
  }
  if (!payload) return json({ error: 'invalid' }, 400);

  // Honeypot: un bot rellenó el campo oculto. Respondemos "ok" sin enviar nada.
  if (payload.website) return json({ ok: true });

  if (payload.name.length < 2 || !EMAIL_RE.test(payload.email)) {
    return json({ error: 'invalid' }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return json({ error: 'not_configured' }, 500);
  }

  const subject = oneLine(`Nueva cotización: ${payload.project || 'Sitio web'} — ${payload.name}`).slice(0, 150);

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM || DEFAULT_FROM,
        to: [env.CONTACT_TO || DEFAULT_TO],
        reply_to: payload.email,
        subject,
        text: buildText(payload),
        html: buildHtml(payload),
      }),
    });
  } catch {
    return json({ error: 'send_failed' }, 502);
  }

  if (!res.ok) {
    return json({ error: 'send_failed' }, 502);
  }

  return json({ ok: true });
};

/** Cualquier método distinto de POST responde 405 (POST usa onRequestPost). */
export const onRequest = async (): Promise<Response> =>
  new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });