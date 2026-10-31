'use server';

import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { clientIp, getViewer } from '@/lib/auth/session';
import { layout, sendEmail } from '@/lib/providers/email';
import { BRAND, CONTACT } from '@/lib/config';
import { createTicket } from '@/lib/tickets';

const Msg = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  contact: z.string().trim().min(6, 'Enter a phone number or email so we can reply.').max(120),
  topic: z.enum(['Buying advice', 'Bulk or business order', 'An existing order', 'Warranty or repair', 'Something else']),
  body: z.string().trim().min(10, 'Tell us a little more.').max(3000),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

export async function sendMessage(input: z.input<typeof Msg>) {
  const p = Msg.safeParse(input);
  if (!p.success) return { ok: false as const, error: p.error.issues[0].message, field: String(p.error.issues[0].path[0]) };
  const ip = await clientIp();
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.ip, ip), gt(messages.createdAt, new Date(Date.now() - 3_600_000))));
  if (n >= 5) return { ok: false as const, error: 'You’ve sent several messages already. We’ll reply soon, or WhatsApp us.' };
  const v = await getViewer();
  const m = p.data;
  // Kept as a message (for the per-network limit) and opened as a support ticket for staff.
  await d.insert(messages).values({ name: m.name, contact: m.contact, topic: m.topic, body: m.body, userId: v?.user.id ?? null, ip, handled: true });
  const category = { 'Buying advice': 'product', 'Bulk or business order': 'business', 'An existing order': 'order', 'Warranty or repair': 'warranty', 'Something else': 'other' }[m.topic];
  const t = await createTicket({ userId: v?.user.id ?? null, name: m.name, contact: m.contact, subject: m.topic, category, body: m.body });
  await sendEmail({
    to: process.env.CONTACT_INBOX ?? CONTACT.email,
    subject: `[${BRAND.name}] ${t.number} ${m.topic}: ${m.name}`,
    text: `${m.name} (${m.contact})\n${m.topic}\n\n${m.body}\n\nReply: ${BRAND.url}/admin/tickets/${t.number}`,
    html: layout(m.topic, `<p style="font-size:15px"><b>${escape(m.name)}</b>, ${escape(m.contact)}</p><p style="font-size:15px;line-height:1.6;white-space:pre-wrap">${escape(m.body)}</p><p><a href="${BRAND.url}/admin/tickets/${t.number}">Open ticket ${t.number}</a></p>`),
  }).catch((e) => console.error('contact email', e));
  return { ok: true as const, number: t.number };
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
