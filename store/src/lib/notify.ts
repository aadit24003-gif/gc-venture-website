/**
 * Sends a templated message by email, SMS and/or WhatsApp, and records each attempt in the
 * notifications table. Never throws: a failed message must not break an order.
 */
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { notificationTemplates, notifications } from './db/schema';
import { BRAND, isDemo } from './config';
import { TEMPLATES, type Channel, type TemplateKey } from './templates';
import { emailConfigured, layout, markdownEmail, sendEmail } from './providers/email';
import { sendFlowSms, smsFlowConfigured } from './providers/sms';
import { sendWhatsappTemplate, whatsappConfigured } from './providers/whatsapp';

export type Recipients = { email?: string | null; phone?: string | null };
type Vars = Record<string, string | number | null | undefined>;

export function render(text: string, vars: Vars) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    if (k === 'brand') return BRAND.name;
    const v = vars[k];
    return v == null ? '' : String(v);
  });
}

/** The template for a key and channel: the staff-edited copy if any, else the default. */
export async function resolveTemplate(key: TemplateKey, channel: Channel): Promise<{ subject: string | null; body: string; enabled: boolean } | null> {
  const d = await db();
  const [row] = await d.select().from(notificationTemplates)
    .where(and(eq(notificationTemplates.key, key), eq(notificationTemplates.channel, channel))).limit(1);
  if (row) return { subject: row.subject, body: row.body, enabled: row.enabled };
  const def = TEMPLATES[key] as Record<string, unknown>;
  const c = def[channel] as { subject?: string; body: string } | undefined;
  if (!c) return null;
  // SMS and WhatsApp need a provider template ID before they can be sent, so they start switched off.
  return { subject: c.subject ?? null, body: c.body, enabled: channel === 'email' };
}

async function log(channel: Channel, template: string, recipient: string, subject: string | null, status: string, error: string | null, ref?: string | null) {
  try {
    const d = await db();
    await d.insert(notifications).values({ channel, template, recipient, subject, status, error: error?.slice(0, 500) ?? null, ref: ref ?? null });
  } catch (e) {
    console.error('notification log failed', e);
  }
}

export async function notify(key: TemplateKey, to: Recipients, vars: Vars, ref?: string | null): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (to.email) {
    tasks.push((async () => {
      const t = await resolveTemplate(key, 'email');
      if (!t) return;
      if (!t.enabled) return log('email', key, to.email!, t.subject, 'skipped', 'Template switched off', ref);
      const subject = render(t.subject ?? BRAND.name, vars);
      const bodyMd = render(t.body, vars);
      try {
        await sendEmail({ to: to.email!, subject, text: bodyMd.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2').replace(/\*\*/g, ''), html: layout(subject, markdownEmail(bodyMd)) });
        await log('email', key, to.email!, subject, emailConfigured() ? 'sent' : 'demo', null, ref);
      } catch (e) {
        await log('email', key, to.email!, subject, 'failed', e instanceof Error ? e.message : String(e), ref);
      }
    })());
  }

  if (to.phone) {
    tasks.push((async () => {
      const t = await resolveTemplate(key, 'sms');
      if (!t) return;
      const text = render(t.body, vars);
      if (!t.enabled || !t.subject) return log('sms', key, to.phone!, null, 'skipped', !t.enabled ? 'Template switched off' : 'No DLT template ID set', ref);
      if (!smsFlowConfigured()) return log('sms', key, to.phone!, null, isDemo() ? 'demo' : 'skipped', 'MSG91 not configured', ref);
      try {
        await sendFlowSms(to.phone!, t.subject, Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v == null ? '' : String(v)])));
        await log('sms', key, to.phone!, text.slice(0, 160), 'sent', null, ref);
      } catch (e) {
        await log('sms', key, to.phone!, text.slice(0, 160), 'failed', e instanceof Error ? e.message : String(e), ref);
      }
    })());

    tasks.push((async () => {
      const t = await resolveTemplate(key, 'whatsapp');
      if (!t) return;
      if (!t.enabled || !t.subject) return log('whatsapp', key, to.phone!, null, 'skipped', !t.enabled ? 'Template switched off' : 'No approved WhatsApp template name set', ref);
      if (!whatsappConfigured()) return log('whatsapp', key, to.phone!, null, isDemo() ? 'demo' : 'skipped', 'WhatsApp not configured', ref);
      // Parameters in the order the placeholders appear in the body.
      const params = [...t.body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => (m[1] === 'brand' ? BRAND.name : String(vars[m[1]] ?? '')));
      try {
        await sendWhatsappTemplate(to.phone!, t.subject, params);
        await log('whatsapp', key, to.phone!, t.subject, 'sent', null, ref);
      } catch (e) {
        await log('whatsapp', key, to.phone!, t.subject, 'failed', e instanceof Error ? e.message : String(e), ref);
      }
    })());
  }

  await Promise.allSettled(tasks);
}
