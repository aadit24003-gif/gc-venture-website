/**
 * Email delivery through Resend (https://resend.com).
 * Set RESEND_API_KEY and EMAIL_FROM (e.g. "Encore <orders@yourdomain.in>").
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
  return `<!doctype html><html><body style="margin:0;background:#ECEFEA;font-family:Arial,Helvetica,sans-serif;color:#1E2B27">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0F3D33;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold">${BRAND.name}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0F3D33">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px 24px;font-size:12px;color:#5C6B66">${BRAND.name}: ${BRAND.tagline}. You received this email because of activity on your account.</td></tr>
</table></td></tr></table></body></html>`;
}
