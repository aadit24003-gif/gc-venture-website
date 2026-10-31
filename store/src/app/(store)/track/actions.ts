'use server';

import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, otps } from '@/lib/db/schema';
import { clientIp } from '@/lib/auth/session';
import { guestKey } from '@/lib/orders';

/** Finds an order by its number and the email or mobile used on it; returns its private link. */
export async function lookupOrder(numberRaw: string, contactRaw: string): Promise<{ ok: true; href: string } | { ok: false; error: string }> {
  const number = numberRaw.trim().toUpperCase();
  const contact = contactRaw.trim().toLowerCase();
  if (!/^[A-Z0-9-]{6,30}$/.test(number) || contact.length < 5) return { ok: false, error: 'Enter the order number and the email or mobile number you used.' };
  const ip = await clientIp();
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(otps).where(and(eq(otps.purpose, 'track'), eq(otps.ip, ip), gt(otps.createdAt, new Date(Date.now() - 3_600_000))));
  if (n >= 20) return { ok: false, error: 'Too many lookups from this network. Try again in an hour, or sign in.' };
  await d.insert(otps).values({ purpose: 'track', channel: 'lookup', destination: number, codeHash: '-', expiresAt: new Date(), ip, consumedAt: new Date() });
  const [o] = await d.select().from(orders).where(eq(orders.number, number)).limit(1);
  const phone = contact.replace(/\D/g, '').slice(-10);
  const match = o && ((o.email && o.email.toLowerCase() === contact) || (phone.length === 10 && o.phone === phone));
  if (!o || !match) return { ok: false, error: 'We couldn’t find an order with those details. Check the number in your confirmation email.' };
  return { ok: true, href: `/orders/${o.number}?key=${guestKey(o.id)}` };
}
