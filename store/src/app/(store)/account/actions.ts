'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { addresses, ticketMessages, tickets, users } from '@/lib/db/schema';
import { clientIp, endOtherSessions, getViewer, startSession } from '@/lib/auth/session';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/auth/password';
import { sendVerificationEmail } from '@/lib/auth/verify';
import { checkCode, sendCode } from '@/lib/auth/otp';
import { STATES } from '@/lib/india';
import { createTicket, TICKET_CATEGORIES } from '@/lib/tickets';
import { mask } from '@/lib/format';

type R = { ok: true; message?: string } | { ok: false; error: string; field?: string };
const need = async () => {
  const v = await getViewer();
  if (!v) throw new Error('signed out');
  return v;
};

export async function updateProfile(input: { name: string; marketing: boolean }): Promise<R> {
  const v = await need();
  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (name.length < 2) return { ok: false, error: 'Enter your name.', field: 'name' };
  const d = await db();
  await d.update(users).set({ name, marketingOptIn: !!input.marketing }).where(eq(users.id, v.user.id));
  revalidatePath('/account', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function changeEmail(raw: string): Promise<R> {
  const v = await need();
  const e = z.string().trim().toLowerCase().email().safeParse(raw);
  if (!e.success) return { ok: false, error: 'Enter a valid email address.', field: 'email' };
  if (e.data === v.user.email) return v.user.emailVerifiedAt ? { ok: true, message: 'That’s already your email.' } : (await sendVerificationEmail(v.user.id, e.data, v.user.name), { ok: true, message: `We sent a confirmation link to ${e.data}.` });
  const d = await db();
  const [taken] = await d.select({ id: users.id }).from(users).where(and(eq(users.email, e.data), ne(users.id, v.user.id))).limit(1);
  if (taken) return { ok: false, error: 'Another account uses this email.', field: 'email' };
  await d.update(users).set({ email: e.data, emailVerifiedAt: null }).where(eq(users.id, v.user.id));
  await sendVerificationEmail(v.user.id, e.data, v.user.name);
  revalidatePath('/account', 'layout');
  return { ok: true, message: `Updated. Confirm it with the link we sent to ${e.data}.` };
}

/** Step 1 of adding or changing a mobile number: send a code to it. */
export async function sendPhoneCode(raw: string): Promise<{ ok: true; masked: string; demoCode?: string } | { ok: false; error: string }> {
  const v = await need();
  const phone = raw.replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false, error: 'Enter a 10-digit mobile number.' };
  const d = await db();
  const [taken] = await d.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), ne(users.id, v.user.id))).limit(1);
  if (taken) return { ok: false, error: 'Another account uses this number.' };
  const r = await sendCode({ purpose: 'verify_phone', channel: 'sms', destination: phone, ip: await clientIp(), userId: v.user.id });
  if (!r.ok) return r;
  return { ok: true, masked: mask(phone), demoCode: r.demoCode };
}

/** Step 2: confirm the code and save the number as verified. */
export async function confirmPhone(raw: string, code: string): Promise<R> {
  const v = await need();
  const phone = raw.replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '');
  const r = await checkCode({ purpose: 'verify_phone', destination: phone, code });
  if (!r.ok) return r;
  const d = await db();
  const [taken] = await d.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), ne(users.id, v.user.id))).limit(1);
  if (taken) return { ok: false, error: 'Another account uses this number.' };
  await d.update(users).set({ phone, phoneVerifiedAt: new Date() }).where(eq(users.id, v.user.id));
  revalidatePath('/account', 'layout');
  return { ok: true, message: 'Mobile number confirmed.' };
}

export async function setPassword(current: string, next: string): Promise<R> {
  const v = await need();
  if (v.user.passwordHash && !(await verifyPassword(current, v.user.passwordHash))) return { ok: false, error: 'Your current password isn’t right.', field: 'current' };
  const problem = passwordProblem(next, [v.user.email, v.user.phone]);
  if (problem) return { ok: false, error: problem, field: 'next' };
  const d = await db();
  await d.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, v.user.id));
  await endOtherSessions(v.user.id);
  return { ok: true, message: v.user.passwordHash ? 'Password changed. Other devices were signed out.' : 'Password set. You can now sign in with it.' };
}

export async function signOutEverywhere(): Promise<R> {
  const v = await need();
  const { sessions } = await import('@/lib/db/schema');
  const d = await db();
  await d.delete(sessions).where(eq(sessions.userId, v.user.id));
  await startSession(v.user.id);
  return { ok: true, message: 'Signed out of every other device.' };
}

/* ── Addresses ─────────────────────────────────────────────── */

const Address = z.object({
  label: z.string().trim().max(30).optional().nullable(),
  name: z.string().trim().min(2, 'Enter the name for delivery.').max(80),
  phone: z.string().transform((p) => p.replace(/\D/g, '').slice(-10)).refine((p) => /^[6-9]\d{9}$/.test(p), 'Enter a 10-digit mobile number.'),
  line1: z.string().trim().min(4, 'Enter the house or flat number and street.').max(160),
  line2: z.string().trim().max(160).optional().nullable(),
  landmark: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().min(2, 'Enter the city.').max(80),
  state: z.string().refine((s) => (STATES as readonly string[]).includes(s), 'Choose a state.'),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code.'),
  isDefault: z.boolean().optional(),
});
export type AddressForm = z.input<typeof Address>;

export async function saveAddress(id: number | null, input: AddressForm): Promise<R> {
  const v = await need();
  const p = Address.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message, field: String(p.error.issues[0].path[0]) };
  const d = await db();
  const mine = await d.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, v.user.id));
  if (!id && mine.length >= 10) return { ok: false, error: 'You can save up to 10 addresses. Remove one first.' };
  if (id && !mine.some((m) => m.id === id)) return { ok: false, error: 'Address not found.' };
  const makeDefault = p.data.isDefault || mine.length === 0;
  await d.transaction(async (tx) => {
    if (makeDefault) await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, v.user.id));
    const values = { ...p.data, label: p.data.label || null, isDefault: makeDefault || undefined };
    if (id) await tx.update(addresses).set(values).where(and(eq(addresses.id, id), eq(addresses.userId, v.user.id)));
    else await tx.insert(addresses).values({ ...values, userId: v.user.id, isDefault: makeDefault });
  });
  revalidatePath('/account/addresses');
  return { ok: true, message: id ? 'Address updated.' : 'Address saved.' };
}

export async function deleteAddress(id: number): Promise<R> {
  const v = await need();
  const d = await db();
  const [a] = await d.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, v.user.id))).returning();
  if (a?.isDefault) {
    const [next] = await d.select().from(addresses).where(eq(addresses.userId, v.user.id)).limit(1);
    if (next) await d.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
  }
  revalidatePath('/account/addresses');
  return { ok: true, message: 'Address removed.' };
}

export async function makeDefaultAddress(id: number): Promise<R> {
  const v = await need();
  const d = await db();
  const [a] = await d.select().from(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, v.user.id))).limit(1);
  if (!a) return { ok: false, error: 'Address not found.' };
  await d.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, v.user.id));
  await d.update(addresses).set({ isDefault: true }).where(eq(addresses.id, id));
  revalidatePath('/account/addresses');
  return { ok: true, message: 'Default address changed.' };
}

/* ── Support ───────────────────────────────────────────────── */

export async function openTicket(input: { category: string; subject: string; body: string; orderNumber?: string | null }): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const v = await need();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length < 3) return { ok: false, error: 'Add a short subject.' };
  if (body.length < 10) return { ok: false, error: 'Tell us a little more (at least 10 characters).' };
  if (!(input.category in TICKET_CATEGORIES)) return { ok: false, error: 'Choose a topic.' };
  let orderId: string | null = null;
  if (input.orderNumber) {
    const { orders } = await import('@/lib/db/schema');
    const d = await db();
    const [o] = await d.select({ id: orders.id, userId: orders.userId }).from(orders).where(eq(orders.number, input.orderNumber)).limit(1);
    if (o && o.userId === v.user.id) orderId = o.id;
  }
  const t = await createTicket({ userId: v.user.id, name: v.user.name ?? 'Customer', contact: v.user.email ?? v.user.phone ?? '', subject, category: input.category, body, orderId });
  revalidatePath('/account/support');
  return { ok: true, number: t.number };
}

export async function replyTicket(number: string, body: string): Promise<R> {
  const v = await need();
  const text = body.trim();
  if (text.length < 2) return { ok: false, error: 'Write a message.' };
  const d = await db();
  const [t] = await d.select().from(tickets).where(eq(tickets.number, number)).limit(1);
  if (!t || t.userId !== v.user.id) return { ok: false, error: 'Conversation not found.' };
  await d.insert(ticketMessages).values({ ticketId: t.id, authorId: v.user.id, fromStaff: false, body: text.slice(0, 5000) });
  await d.update(tickets).set({ status: 'open', updatedAt: new Date() }).where(eq(tickets.id, t.id));
  revalidatePath(`/account/support/${number}`);
  return { ok: true };
}
