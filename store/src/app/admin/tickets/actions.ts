'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ticketMessages, tickets } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';
import { BRAND } from '@/lib/config';

export async function staffReply(id: number, fd: FormData) {
  const v = await staffCan('tickets.manage');
  if (!v) return { ok: false, error: 'Your role can’t do that.' };
  const body = String(fd.get('body') ?? '').trim();
  const internal = fd.get('internal') === 'on';
  const status = String(fd.get('status') ?? '');
  if (!body && !status) return { ok: false, error: 'Write a reply or choose a status.' };
  const d = await db();
  const [t] = await d.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!t) return { ok: false, error: 'Ticket not found.' };
  if (body) await d.insert(ticketMessages).values({ ticketId: id, authorId: v.user.id, fromStaff: true, internal, body: body.slice(0, 5000) });
  const nextStatus = ['open', 'waiting_customer', 'resolved', 'closed'].includes(status) ? status : body && !internal ? 'waiting_customer' : t.status;
  await d.update(tickets).set({ status: nextStatus, updatedAt: new Date(), assigneeId: t.assigneeId ?? v.user.id }).where(eq(tickets.id, id));
  if (body && !internal) {
    const email = t.contact.includes('@') ? t.contact : null;
    await notify('ticket_reply', { email }, { name: t.name, ticket_number: t.number, subject: t.subject, message: body, ticket_url: t.userId ? `${BRAND.url}/account/support/${t.number}` : `${BRAND.url}/contact` }, t.number);
  }
  await audit(v, 'ticket.reply', 'ticket', t.number, { internal, status: nextStatus });
  revalidatePath(`/admin/tickets/${t.number}`);
  return { ok: true, message: internal ? 'Internal note added.' : body ? (t.contact.includes('@') ? 'Reply sent by email.' : 'Reply saved. This customer gave a phone number: call or WhatsApp them.') : 'Status changed.' };
}
