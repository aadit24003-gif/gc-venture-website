'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { addresses, orders, users } from '@/lib/db/schema';
import { getViewer } from '@/lib/auth/session';
import { BRAND, isDemo } from '@/lib/config';
import { canViewOrder, createOrder, dueOnline, guestKey, markPaid, markPaymentFailed, quote, type Order } from '@/lib/orders';
import { checkoutLines, removeUnitsFromCart } from '@/lib/cart';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId, verifyPaymentSignature } from '@/lib/providers/razorpay';
import { STATES, isGstin } from '@/lib/india';

const phone10 = z.string().transform((p) => p.replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '')).refine((p) => /^[6-9]\d{9}$/.test(p), 'Enter a 10-digit mobile number.');

/** Totals for the current server cart. */
export async function getQuote(input: { coupon: string | null; cod: boolean; state: string | null; email?: string | null; phone?: string | null }) {
  const v = await getViewer();
  const { cart, items } = await checkoutLines();
  if (!items.length) return { ok: false as const, error: cart.lines.length ? 'The laptops in your cart are no longer available. Remove them and pick others.' : 'Your cart is empty.', cart };
  const ph = input.phone ? phone10.safeParse(input.phone) : null;
  const q = await quote({ userId: v?.user.id ?? null, email: (input.email || v?.user.email || null)?.toLowerCase() ?? null, phone: (ph?.success ? ph.data : null) ?? v?.user.phone ?? null }, items, input.coupon, input.cod, input.state);
  return q.ok ? { ...q, cart } : { ...q, cart };
}

const Address = z.object({
  name: z.string().trim().min(2, 'Enter the name for delivery.').max(80),
  phone: phone10,
  line1: z.string().trim().min(4, 'Enter the house or flat number and street.').max(160),
  line2: z.string().trim().max(160).optional().nullable(),
  landmark: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().min(2, 'Enter the city.').max(80),
  state: z.string().refine((s) => (STATES as readonly string[]).includes(s), 'Choose a state.'),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code.'),
});
export type AddressInput = z.input<typeof Address>;

const Place = z.object({
  addressId: z.number().int().positive().nullable(),
  address: Address.nullable(),
  saveAddress: z.boolean(),
  email: z.string().trim().toLowerCase().email('Enter a valid email for your receipt and updates.').or(z.literal('')).nullable(),
  method: z.enum(['online', 'cod', 'book']),
  coupon: z.string().trim().max(40).nullable(),
  gstin: z.string().trim().toUpperCase().refine((g) => !g || isGstin(g), 'That GSTIN doesn’t look right (15 characters, e.g. 06ABCDE1234F1Z5).').nullable(),
  acceptTerms: z.literal(true, { message: 'Please accept the terms of sale.' }),
});
export type PlaceInput = z.input<typeof Place>;

export type PlaceResult =
  | { ok: true; number: string; next: 'done' | 'pay'; key: string | null }
  | { ok: false; error: string; field?: string };

export async function placeOrder(input: PlaceInput): Promise<PlaceResult> {
  const v = await getViewer();
  const parsed = Place.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path.join('.') };
  }
  const p = parsed.data;
  const d = await db();

  let address = p.address;
  if (p.addressId) {
    if (!v) return { ok: false, error: 'Add a delivery address.' };
    const [a] = await d.select().from(addresses).where(and(eq(addresses.id, p.addressId), eq(addresses.userId, v.user.id))).limit(1);
    if (!a) return { ok: false, error: 'Choose a delivery address.' };
    address = { name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode };
  }
  if (!address) return { ok: false, error: 'Add a delivery address.' };
  const email = p.email || v?.user.email || null;
  if (!v && !email) return { ok: false, error: 'Enter your email so we can send your receipt and order updates.', field: 'email' };

  if (v && !v.user.name) await d.update(users).set({ name: address.name }).where(eq(users.id, v.user.id));
  if (v && p.saveAddress && !p.addressId) {
    const existing = await d.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, v.user.id)).limit(1);
    await d.insert(addresses).values({ userId: v.user.id, ...address, isDefault: existing.length === 0 });
  }

  const method = p.method === 'cod' ? 'cod' : razorpayConfigured() ? 'razorpay' : isDemo() ? 'demo' : null;
  if (!method) return { ok: false, error: 'Online payment is not switched on yet. Choose pay on delivery or contact us.' };

  const { items } = await checkoutLines();
  if (!items.length) return { ok: false, error: 'Your cart is empty or its laptops were just sold. Review your cart.' };
  const res = await createOrder({
    userId: v?.user.id ?? null, items, address, email, phone: address.phone,
    method, couponCode: p.coupon, gstin: p.gstin || null, name: address.name, book: p.method === 'book',
  });
  if (!res.ok) return res;
  await removeUnitsFromCart(items.map((i) => i.unitId));
  return { ok: true, number: res.order.number, next: method === 'cod' ? 'done' : 'pay', key: v ? null : guestKey(res.order.id) };
}

export type PaymentStart =
  | { ok: true; mode: 'razorpay'; keyId: string; rzpOrderId: string; amount: number; name: string; description: string; prefill: { name: string; email?: string; contact: string } }
  | { ok: true; mode: 'demo'; amount: number }
  | { ok: false; error: string };

/** The order, if the current visitor may act on it (account owner, verified contact, or guest key). */
async function ownOrder(number: string, key?: string | null): Promise<Order | null> {
  if (!/^[A-Z0-9-]{6,30}$/.test(number)) return null;
  const v = await getViewer();
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!o) return null;
  return canViewOrder(v ? { user: v.user } : null, o, key) ? o : null;
}

/** Starts (or restarts) payment for an unpaid online order. */
export async function beginPayment(number: string, key?: string | null): Promise<PaymentStart> {
  const o = await ownOrder(number, key);
  if (!o) return { ok: false, error: 'Order not found.' };
  if (o.paymentStatus === 'paid' || o.paymentStatus === 'part_paid') return { ok: false, error: 'This order is already paid.' };
  if (!['awaiting_payment', 'payment_failed'].includes(o.status)) return { ok: false, error: 'This order can no longer be paid. Place a new order.' };

  if (!razorpayConfigured()) {
    if (!isDemo()) return { ok: false, error: 'Online payment is not switched on yet.' };
    return { ok: true, mode: 'demo', amount: dueOnline(o) };
  }
  const d = await db();
  let rzpId = o.razorpayOrderId;
  if (!rzpId) {
    const r = await createRazorpayOrder({ amount: dueOnline(o), receipt: o.number, notes: { order: o.number, ...(o.bookingAmount ? { kind: 'booking' } : {}) } });
    rzpId = r.id;
    await d.update(orders).set({ razorpayOrderId: rzpId, paymentMethod: 'razorpay' }).where(eq(orders.id, o.id));
    const { payments } = await import('@/lib/db/schema');
    await d.update(payments).set({ provider: 'razorpay', providerOrderId: rzpId, updatedAt: new Date() }).where(and(eq(payments.orderId, o.id), eq(payments.status, 'created')));
  }
  return {
    ok: true, mode: 'razorpay', keyId: razorpayKeyId(), rzpOrderId: rzpId, amount: dueOnline(o),
    name: BRAND.name, description: o.bookingAmount ? `Booking for order ${o.number}` : `Order ${o.number}`,
    prefill: { name: o.address.name, email: o.email ?? undefined, contact: `+91${o.phone}` },
  };
}

export async function confirmRazorpayPayment(number: string, r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }, key?: string | null) {
  const o = await ownOrder(number, key);
  if (!o || o.razorpayOrderId !== r.razorpay_order_id) return { ok: false as const, error: 'Payment does not match this order.' };
  if (!verifyPaymentSignature(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature)) {
    return { ok: false as const, error: 'We could not verify this payment. If money was taken, it will be matched automatically within minutes.' };
  }
  await markPaid(o.id, { provider: 'razorpay', paymentId: r.razorpay_payment_id, providerOrderId: r.razorpay_order_id });
  return { ok: true as const };
}

/** Demo mode only: completes or fails a simulated payment. */
export async function completeDemoPayment(number: string, outcome: 'success' | 'failure', key?: string | null) {
  if (!isDemo() || razorpayConfigured()) return { ok: false as const, error: 'Not available.' };
  const o = await ownOrder(number, key);
  if (!o) return { ok: false as const, error: 'Order not found.' };
  if (outcome === 'success') await markPaid(o.id, { provider: 'demo', paymentId: `demo_${Date.now()}`, method: 'upi' }, 'Payment received (demo)');
  else await markPaymentFailed(o.id, 'Simulated payment failure (demo)');
  return { ok: true as const };
}

export async function reportPaymentFailure(number: string, reason: string, key?: string | null) {
  const o = await ownOrder(number, key);
  if (o) await markPaymentFailed(o.id, reason || 'Payment failed');
}
