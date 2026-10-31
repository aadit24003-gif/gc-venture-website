'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { notificationTemplates } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { TEMPLATES, type Channel, type TemplateKey } from '@/lib/templates';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';

export async function saveTemplate(key: string, channel: string, fd: FormData) {
  const v = await staffCan('notifications.manage');
  if (!v) return { ok: false, error: 'Only super admins can edit messages.' };
  if (!(key in TEMPLATES) || !['email', 'sms', 'whatsapp'].includes(channel)) return { ok: false, error: 'Unknown template.' };
  const body = String(fd.get('body') ?? '').trim();
  if (body.length < 5) return { ok: false, error: 'The message is empty.' };
  const values = { subject: String(fd.get('subject') ?? '').trim().slice(0, 200) || null, body: body.slice(0, 5000), enabled: fd.get('enabled') === 'on', updatedBy: v.user.id, updatedAt: new Date() };
  const d = await db();
  await d.insert(notificationTemplates).values({ key, channel, name: TEMPLATES[key as TemplateKey].name, ...values })
    .onConflictDoUpdate({ target: [notificationTemplates.key, notificationTemplates.channel], set: values });
  await audit(v, 'template.update', 'template', `${key}:${channel}`, { enabled: values.enabled });
  revalidatePath('/admin/notifications');
  return { ok: true, message: 'Saved.' };
}

export async function sendTest(key: string) {
  const v = await staffCan('notifications.manage');
  if (!v) return { ok: false, error: 'Only super admins can do this.' };
  if (!(key in TEMPLATES)) return { ok: false, error: 'Unknown template.' };
  if (!v.user.email) return { ok: false, error: 'Add an email to your account to receive tests.' };
  const sample = Object.fromEntries(TEMPLATES[key as TemplateKey].vars.map((x) => [x, `[${x}]`]));
  await notify(key as TemplateKey, { email: v.user.email }, { ...sample, name: v.user.name ?? 'there' }, 'test');
  return { ok: true, message: `Test sent to ${v.user.email}. See the log below.` };
}

export type { Channel };
