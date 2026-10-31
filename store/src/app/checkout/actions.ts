'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { addresses, orders, users } from '@/lib/db/schema';
import { getViewer } from '@/lib/auth/session';
import { BRAND, isDemo } from '@/lib/config';
import { createOrder, markPaid, markPaymentFailed, quote, type CartInput } from '@/lib/orders';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId, verifyPaymentSignature } from '@/lib/providers/razorpay';
import { STATES, isGstin } from '@/lib/india';

const Line = z.object({
  productId: z.string().min(1).max(120),
  grade: z.string().max(20),
  ramGb: z.number().int().positive(),
  ssdGb: z.number().int().positive(),
  warrantyMonths: z.number().int().positive(),
  qty: z.number().int().min(1).max(5),
});
const Lines = z.array(Line).min(1).max(20);

export async function getQuote(lines: CartInput[], coupon: string | null, cod: boolean) {
  const parsed = Lines.safeParse(lines);
  if (!parsed.success) return { ok: false as const, error: 'Your cart could not be read. Refresh the page.' };
  const v = await getViewer();
  return quote(v?.user.id ?? null, parsed.data, coupon, cod);
}

const Address = z.object({
  name: z.string().trim().min(2, 'Enter the name for delivery.').max(80),
  phone: z.string().transform((p) => p.replace(/\D/g, '').slice(-10)).refine((p) => /^[6-9]\d{9}$/.test(p), 'Enter a 10-digit mobile number.'),
  line1: z.string().trim().min(4, 'Enter the house or flat number and street.').max(160),
  line2: z.string().trim().max(160).optional().nullable(),
  landmark: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().min(2, 'Enter the city.').max(80),
  state: z.string().refine((s) => (STATES as readonly string[]).includes(s), 'Choose a state.'),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code.'),
});
export type AddressInput = z.input<typeof Address>;

const Place = z.object({
  lines: Lines,
  addressId: z.number().int().positive().nullable(),
  address: Address.nullable(),
  saveAddress: z.boolean(),
  email: z.string().trim().toLowerCase().email('Enter a valid email for your receipt.').or(z.literal('')).nullable(),
  method: z.enum(['online', 'cod']),
  coupon: z.string().trim().max(40).nullable(),
  gstin: z.string().trim().toUpperCase().refine((g) => !g || isGstin(g), 'That GSTIN doesn’t look right (15 characters, e.g. 06ABCDE1234F1Z5).').nullable(),
});
export type PlaceInput = z.input<typeof Place>;

export type PlaceResult =
  | { ok: true; number: string; next: 'done' | 'pay' }
  | { ok: false; error: string; field?: string };

export async function placeOrder(input: PlaceInput): Promise<PlaceResult> {
  const v = await getViewer();
  if (!v) return { ok: false, error: 'Sign in to place your order.' };
  const parsed = Place.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path.join('.') };
  }
  const p = parsed.data;
  const d = await db();

  let address = p.address;
  if (p.addressId) {
    const [a] = await d.select().from(addresses).where(and(eq(addresses.id, p.addressId), eq(addresses.userId, v.user.id))).limit(1);
    if (!a) return { ok: false, error: 'Choose a delivery address.' };
    address = { name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode };
  }
  if (!address) return { ok: false, error: 'Add a delivery address.' };

  if (!v.user.name) await d.update(users).set({ name: address.name }).where(eq(users.id, v.user.id));

  if (p.saveAddress && !p.addressId) {
    const existing = await d.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, v.user.id)).limit(1);
    await d.insert(addresses).values({ userId: v.user.id, ...address, isDefault: existing.length === 0 });
  }

  const method = p.method === 'cod' ? 'cod' : razorpayConfigured() ? 'razorpay' : isDemo() ? 'demo' : null;
  if (!method) return { ok: false, error: 'Online payment is not switched on yet. Choose pay on delivery or contact us.' };

  const res = await createOrder({
    userId: v.user.id, lines: p.lines, address, email: p.email || v.user.email, phone: address.phone,
    method, couponCode: p.coupon, gstin: p.gstin || null,
  });
  if (!res.ok) return res;
  return { ok: true, number: res.order.number, next: method === 'cod' ? 'done' : 'pay' };
}

export type PaymentStart =
  | { ok: true; mode: 'razorpay'; keyId: string; rzpOrderId: string; amount: number; name: string; description: string; prefill: { name: string; email?: string; contact: string } }
  | { ok: true; mode: 'demo'; amount: number }
  | { ok: false; error: string };

async function ownOrder(number: string) {
  const v = await getViewer();
  if (!v) return null;
  const d = await db();
  const [o] = await d.select().from(orders).where(and(eq(orders.number, number), eq(orders.userId, v.user.id))).limit(1);
  return o ?? null;
}

/** Starts (or restarts) payment for an unpaid online order. */
export async function beginPayment(number: string): Promise<PaymentStart> {
  const o = await ownOrder(number);
  if (!o) return { ok: false, error: 'Order not found.' };
  if (o.paymentStatus === 'paid') return { ok: false, error: 'This order is already paid.' };
  if (!['awaiting_payment', 'payment_failed'].includes(o.status)) return { ok: false, error: 'This order can no longer be paid. Place a new order.' };

  if (!razorpayConfigured()) {
    if (!isDemo()) return { ok: false, error: 'Online payment is not switched on yet.' };
    return { ok: true, mode: 'demo', amount: o.total };
  }
  const d = await db();
  let rzpId = o.razorpayOrderId;
  if (!rzpId) {
    const r = await createRazorpayOrder({ amount: o.total, receipt: o.number, notes: { order: o.number } });
    rzpId = r.id;
    await d.update(orders).set({ razorpayOrderId: rzpId, paymentMethod: 'razorpay' }).where(eq(orders.id, o.id));
  }
  return {
    ok: true, mode: 'razorpay', keyId: razorpayKeyId(), rzpOrderId: rzpId, amount: o.total,
    name: BRAND.name, description: `Order ${o.number}`,
    prefill: { name: o.address.name, email: o.email ?? undefined, contact: `+91${o.phone}` },
  };
}

export async function confirmRazorpayPayment(number: string, r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const o = await ownOrder(number);
  if (!o || o.razorpayOrderId !== r.razorpay_order_id) return { ok: false as const, error: 'Payment does not match this order.' };
  if (!verifyPaymentSignature(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature)) {
    return { ok: false as const, error: 'We could not verify this payment. If money was taken, it will be matched automatically within minutes.' };
  }
  await markPaid(o.id, r.razorpay_payment_id);
  return { ok: true as const };
}

/** Demo mode only: completes or fails a simulated payment. */
export async function completeDemoPayment(number: string, outcome: 'success' | 'failure') {
  if (!isDemo() || razorpayConfigured()) return { ok: false as const, error: 'Not available.' };
  const o = await ownOrder(number);
  if (!o) return { ok: false as const, error: 'Order not found.' };
  if (outcome === 'success') await markPaid(o.id, `demo_${Date.now()}`, 'Payment received (demo)');
  else await markPaymentFailed(o.id, 'Simulated payment failure (demo)');
  return { ok: true as const };
}

export async function reportPaymentFailure(number: string, reason: string) {
  const o = await ownOrder(number);
  if (o) await markPaymentFailed(o.id, reason || 'Payment failed');
}
