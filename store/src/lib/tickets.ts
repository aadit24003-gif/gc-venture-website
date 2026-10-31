/**
 * Support tickets: from the contact form (guests) or from the account (signed in).
 */
import crypto from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from './db';
import { ticketMessages, tickets } from './db/schema';
import { BRAND } from './config';
import { notify } from './notify';

export type Ticket = typeof tickets.$inferSelect;
export const TICKET_CATEGORIES: Record<string, string> = {
  order: 'An order', product: 'Choosing a laptop', payment: 'Payment or refund', warranty: 'Warranty or repair',
  student: 'Student discount', business: 'Business or bulk order', other: 'Something else',
};
export const TICKET_STATUS: Record<string, { label: string; tone: 'wait' | 'ok' | 'done' | 'bad' | 'info' }> = {
  open: { label: 'Open', tone: 'wait' }, waiting_customer: { label: 'Waiting for you', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'done' }, closed: { label: 'Closed', tone: 'done' },
};

function newNumber() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return `T-${Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('')}`;
}

export async function createTicket(input: { userId: string | null; name: string; contact: string; subject: string; category: string; body: string; orderId?: string | null }) {
  const d = await db();
  const [t] = await d.insert(tickets).values({
    number: newNumber(), userId: input.userId, name: input.name, contact: input.contact, subject: input.subject.slice(0, 140),
    category: input.category in TICKET_CATEGORIES ? input.category : 'other', orderId: input.orderId ?? null,
  }).returning();
  await d.insert(ticketMessages).values({ ticketId: t.id, authorId: input.userId, fromStaff: false, body: input.body.slice(0, 5000) });
  const email = input.contact.includes('@') ? input.contact : null;
  await notify('ticket_received', { email }, { name: input.name, ticket_number: t.number, subject: t.subject, ticket_url: `${BRAND.url}/account/support/${t.number}` }, t.number);
  return t;
}

export async function ticketByNumber(number: string) {
  const d = await db();
  const [t] = await d.select().from(tickets).where(eq(tickets.number, number)).limit(1);
  if (!t) return null;
  const messages = await d.select().from(ticketMessages).where(eq(ticketMessages.ticketId, t.id)).orderBy(ticketMessages.createdAt);
  return { ticket: t, messages };
}

export async function ticketsForUser(userId: string) {
  const d = await db();
  return d.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.updatedAt));
}
