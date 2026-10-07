/**
 * POST /api/contact
 *
 * Cloudflare Pages Function: cotizador → correo a Kadmiel + copia al cliente (Resend).
 *
 * Variables (Pages → Settings → Variables and secrets):
 *   RESEND_API_KEY  (secret, obligatorio)
 *   CONTACT_TO      (opcional, default contacto@kadmiel.cl)
 *   CONTACT_FROM    (opcional, default Kadmiel Web <web@kadmiel.cl>)
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
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const modulesRaw = Array.isArray(o.modules) ? o.modules : [];
  const modules: ModuleItem[] = modulesRaw
    .map((m) => {
      if (!m || typeof m !== 'object') return null;
      const item = m as Record<string, unknown>;
      const name = str(item.name, 120);
      const price = num(item.price);
      if (!name) return null;
      return { name, price };
    })
    .filter((m): m is ModuleItem => m !== null)
    .slice(0, 20);

  return {
    name: str(o.name, 120),
    email: str(o.email, 200).toLowerCase(),
    phone: str(o.phone, 40),
    company: str(o.company, 120),
    message: str(o.message, 4000),
    website: str(o.website, 200),
    project: str(o.project, 120),
    projectPrice: num(o.projectPrice),
    modules,
    total: num(o.total),
  };
}

function buildText(p: Payload): string {
  const mods =
    p.modules.length > 0
      ? p.modules.map((m) => `  – ${m.name}: ${clp(m.price)}`).join('\n')
      : '  (sin módulos)';
  return [
    'Nueva cotización desde kadmiel.cl',
    '',
    `Nombre: ${p.name}`,
    `Email: ${p.email}`,
    p.phone ? `Teléfono: ${p.phone}` : '',
    p.company ? `Empresa: ${p.company}` : '',
    '',
    `Proyecto: ${p.project} (${clp(p.projectPrice)})`,
    'Módulos:',
    mods,
    '',
    `Total estimado: ${clp(p.total)}`,
    p.message ? `\nMensaje:\n${p.message}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function buildHtml(p: Payload): string {
  const modRows = p.modules
    .map(
      (m) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #334155">${escapeHtml(m.name)}</td><td style="padding:6px 8px;border-bottom:1px solid #334155;text-align:right">${clp(m.price)}</td></tr>`,
    )
    .join('');

  const row = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:8px;color:#94a3b8;vertical-align:top">${label}</td><td style="padding:8px;color:#e2e8f0">${value}</td></tr>`
      : '';

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
  <h2 style="color:#fff;margin:0 0 16px">Nueva cotización</h2>
  <table style="width:100%;max-width:560px;border-collapse:collapse;background:#1e293b;border-radius:12px">
    ${row('Nombre', escapeHtml(p.name))}
    ${row('Email', escapeHtml(p.email))}
    ${row('Teléfono', escapeHtml(p.phone))}
    ${row('Empresa', escapeHtml(p.company))}
    ${row('Proyecto', `${escapeHtml(p.project)} (${clp(p.projectPrice)})`)}
    ${row('Total', `<strong style="color:#22d3ee">${clp(p.total)}</strong>`)}
    ${p.message ? row('Mensaje', escapeHtml(p.message).replace(/\n/g, '<br>')) : ''}
  </table>
  ${
    p.modules.length
      ? `<h3 style="margin:20px 0 8px;color:#cbd5e1">Módulos</h3><table style="width:100%;max-width:560px;border-collapse:collapse">${modRows}</table>`
      : ''
  }
  <p style="margin-top:20px;color:#94a3b8;font-size:12px">Responde este correo para contactar al cliente.</p>
</body></html>`;
}

function buildClientText(p: Payload): string {
  const mods =
    p.modules.length > 0
      ? p.modules.map((m) => `  – ${m.name}: ${clp(m.price)}`).join('\n')
      : '  (sin módulos adicionales)';
  return [
    `Hola ${p.name},`,
    '',
    'Recibimos tu solicitud de cotización en Kadmiel. Este es un resumen de lo que seleccionaste:',
    '',
    `Proyecto: ${p.project} (${clp(p.projectPrice)})`,
    'Módulos:',
    mods,
    '',
    `Total estimado: ${clp(p.total)}`,
    '',
    'Te contactaremos pronto para confirmar alcance y plazos.',
    '',
    '— Equipo Kadmiel',
    'https://kadmiel.cl',
    'WhatsApp: +56 9 4544 2388',
  ].join('\n');
}

function buildClientHtml(p: Payload): string {
  const rows = p.modules
    .map(
      (m) =>
        `<tr><td style="padding:6px 0;color:#cbd5e1">${escapeHtml(m.name)}</td><td style="padding:6px 0;text-align:right;color:#e2e8f0">${clp(m.price)}</td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:16px;padding:28px;border:1px solid #334155">
    <p style="margin:0 0 4px;font-size:12px;color:#22d3ee;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Kadmiel</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#fff">Recibimos tu cotización</h1>
    <p style="margin:0 0 20px;color:#94a3b8;line-height:1.5">Hola <strong style="color:#e2e8f0">${escapeHtml(p.name)}</strong>, este es el resumen de lo que seleccionaste en kadmiel.cl. Te responderemos pronto.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:8px 0;color:#94a3b8">Proyecto</td><td style="padding:8px 0;text-align:right;color:#fff;font-weight:600">${escapeHtml(p.project)}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8">Base</td><td style="padding:8px 0;text-align:right;color:#e2e8f0">${clp(p.projectPrice)}</td></tr>
      ${rows}
      <tr><td style="padding:12px 0 0;border-top:1px solid #334155;color:#22d3ee;font-weight:700">Total estimado</td><td style="padding:12px 0 0;border-top:1px solid #334155;text-align:right;color:#22d3ee;font-weight:800;font-size:18px">${clp(p.total)}</td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#64748b">Si tienes dudas, responde este correo o escríbenos por WhatsApp al +56 9 4544 2388.</p>
  </div>
</body></html>`;
}

export const onRequestPost = async (context: Context): Promise<Response> => {
  const { request, env } = context;

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

  if (payload.website) return json({ ok: true });

  if (payload.name.length < 2 || !EMAIL_RE.test(payload.email)) {
    return json({ error: 'invalid' }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return json({ error: 'not_configured' }, 500);
  }

  const from = env.CONTACT_FROM || DEFAULT_FROM;
  const toInternal = env.CONTACT_TO || DEFAULT_TO;
  const subjectInternal = oneLine(
    `Nueva cotización: ${payload.project || 'Sitio web'} — ${payload.name}`,
  ).slice(0, 150);
  const subjectClient = oneLine(
    `Copia de tu cotización Kadmiel — ${payload.project || 'Sitio web'}`,
  ).slice(0, 150);

  async function sendResend(body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  const okInternal = await sendResend({
    from,
    to: [toInternal],
    reply_to: payload.email,
    subject: subjectInternal,
    text: buildText(payload),
    html: buildHtml(payload),
  });

  if (!okInternal) {
    return json({ error: 'send_failed' }, 502);
  }

  await sendResend({
    from,
    to: [payload.email],
    reply_to: toInternal,
    subject: subjectClient,
    text: buildClientText(payload),
    html: buildClientHtml(payload),
  });

  return json({ ok: true });
};

export const onRequest = async (): Promise<Response> =>
  new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
