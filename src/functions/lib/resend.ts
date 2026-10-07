/**
 * Cliente mínimo de Resend para Cloudflare Pages Functions.
 *
 * Uso:
 *   import { sendEmail } from '../lib/resend';
 *   await sendEmail(env.RESEND_API_KEY, { from, to, subject, html, text, replyTo });
 *
 * Variables (Pages → Settings → Environment variables):
 *   RESEND_API_KEY  (secret)
 */

export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  status?: number;
}

/**
 * Envía un correo con la API de Resend.
 * https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendEmail(
  apiKey: string | undefined,
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  if (!apiKey) {
    return { ok: false, error: 'not_configured', status: 500 };
  }

  const to = Array.isArray(options.to) ? options.to : [options.to];

  const body: Record<string, unknown> = {
    from: options.from,
    to,
    subject: options.subject,
  };

  if (options.html) body.html = options.html;
  if (options.text) body.text = options.text;
  if (options.replyTo) body.reply_to = options.replyTo;

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'network_error', status: 502 };
  }

  if (!res.ok) {
    let detail = 'send_failed';
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) detail = data.message;
    } catch {
      /* ignore */
    }
    return { ok: false, error: detail, status: res.status };
  }

  try {
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch {
    return { ok: true };
  }
}
