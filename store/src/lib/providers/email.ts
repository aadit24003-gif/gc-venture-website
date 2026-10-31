/**
 * Email delivery through Resend (https://resend.com).
 * Set RESEND_API_KEY and EMAIL_FROM (e.g. "LappyClub <orders@yourdomain.in>").
 * Without a key, emails are printed to the server log (demo mode only).
 */
import { BRAND } from '../config';

export type Email = { to: string; subject: string; html: string; text: string };

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

export async function sendEmail(mail: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:demo] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? `${BRAND.name} <onboarding@resend.dev>`,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Email failed (${res.status}): ${await res.text()}`);
}

/** Minimal branded layout that renders well in Gmail and Outlook. */
export function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F4F6F9;font-family:Helvetica,Arial,sans-serif;color:#0D1321">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E9F0">
<tr><td style="padding:22px 28px;border-bottom:1px solid #E5E9F0;font-size:21px;font-weight:bold;letter-spacing:-0.5px;color:#0D1321">${BRAND.name.toLowerCase().replace(/club$/, '')}<span style="color:#2563EB">${BRAND.name.toLowerCase().endsWith('club') ? 'club' : ''}</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0D1321">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px 24px;font-size:12px;color:#566072;border-top:1px solid #E5E9F0">${BRAND.name}: ${BRAND.tagline}. You received this email because of activity on your account or order.</td></tr>
</table></td></tr></table></body></html>`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Renders a template body (light Markdown, see lib/templates.ts) to email HTML. Text is escaped. */
export function markdownEmail(md: string): string {
  return md.trim().split(/\n\s*\n/).map((block) => {
    const b = block.trim();
    const only = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(b);
    if (only) return `<p style="margin:22px 0"><a href="${esc(only[2])}" style="background:#2563EB;color:#ffffff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block">${esc(only[1])}</a></p>`;
    const html = esc(b)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" style="color:#2563EB;font-weight:bold">$1</a>')
      .replace(/\n/g, '<br>');
    return `<p style="font-size:15px;line-height:1.6;margin:0 0 14px">${html}</p>`;
  }).join('\n');
}
