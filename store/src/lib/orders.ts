/**
 * Orders: creation from a cart (prices recomputed here, never trusted from the browser),
 * unit reservation, payments, fulfilment, shipments, cancellations, refunds and warranties.
 */
import crypto from 'node:crypto';
import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { db } from './db';
import {
  couponRedemptions, coupons, inventoryUnits, orderEvents, orderItems, orders, payments, products, refunds,
  serviceRequests, shipments, users, variants, warranties, type OrderAddress, type ShipmentEvent,
} from './db/schema';
import { BRAND, GRADES, POLICY, type GradeKey } from './config';
import { linePrice, totals, type Coupon } from './pricing';
import { isVerifiedStudent } from './students';
import { gb, rupees } from './format';
import { invalidateProducts } from './products';
import { markUnitReturned, releaseUnits, reserveUnits, sellUnits } from './inventory';
import { getSettings } from './settings';
import { gstFromInclusive } from './tax';
import { notify } from './notify';
import { audit } from './audit';
import { hmac, safeEqual } from './auth/secret';
import { NEXT_STATUS, STATUS, type AdminStatus } from './order-status';
import { razorpayConfigured, refundPayment } from './providers/razorpay';

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;

export { STATUS, TIMELINE, ADMIN_STATUSES } from './order-status';

/** Online orders not paid within this many minutes are cancelled and their units released. */
export const HOLD_MINUTES = 30;

type Actor = Parameters<typeof audit>[0];

/* ── Links ─────────────────────────────────────────────────── */

/** Private key that lets a guest open their order without an account. */
export const guestKey = (orderId: string) => hmac('order', orderId).slice(0, 32);
export const checkGuestKey = (orderId: string, key: string | null | undefined) => !!key && safeEqual(guestKey(orderId), key);
export const orderPath = (o: Pick<Order, 'id' | 'number' | 'userId'>) => `/orders/${o.number}${o.userId ? '' : `?key=${guestKey(o.id)}`}`;
export const orderUrl = (o: Pick<Order, 'id' | 'number' | 'userId'>) => `${BRAND.url}${orderPath(o)}`;

/* ── Pricing a checkout ────────────────────────────────────── */

export type CheckoutItem = { unitId: string; ramGb: number; ssdGb: number; warrantyMonths: number };
export type PricedLine = CheckoutItem & {
  productId: string; title: string; brand: string; grade: GradeKey; unitCode: string; serialNumber: string;
  batteryHealth: number | null; installedRamGb: number; installedSsdGb: number; variantId: number; unit: number;
};

export async function priceItems(items: CheckoutItem[]): Promise<{ ok: true; lines: PricedLine[] } | { ok: false; error: string }> {
  if (!items.length) return { ok: false, error: 'Your cart is empty.' };
  if (items.length > 10) return { ok: false, error: 'Too many laptops in one order. Contact us for a business order.' };
  if (new Set(items.map((i) => i.unitId)).size !== items.length) return { ok: false, error: 'The same laptop is in your cart twice.' };
  const d = await db();
  const rows = await d.select({ unit: inventoryUnits, product: products, variant: variants }).from(inventoryUnits)
    .innerJoin(products, eq(products.id, inventoryUnits.productId))
    .leftJoin(variants, and(eq(variants.productId, inventoryUnits.productId), eq(variants.grade, inventoryUnits.grade)))
    .where(inArray(inventoryUnits.id, items.map((i) => i.unitId)));
  const out: PricedLine[] = [];
  for (const it of items) {
    const r = rows.find((x) => x.unit.id === it.unitId);
    if (!r || !r.product.active) return { ok: false, error: 'One of the laptops in your cart is no longer sold. Remove it to continue.' };
    if (r.unit.status !== 'available') return { ok: false, error: `${r.product.title} (${r.unit.code}) was just bought by someone else. Remove it and pick another unit.` };
    const base = r.unit.price ?? (r.variant?.active ? r.variant.price : null);
    if (base == null || !r.variant) return { ok: false, error: `${r.product.title} isn’t priced right now. Remove it to continue.` };
    const unit = linePrice({ price: base, ramGb: r.unit.ramGb, ssdGb: r.unit.ssdGb }, r.product, it);
    if (unit == null) return { ok: false, error: `The configuration chosen for ${r.product.title} is no longer offered.` };
    out.push({
      ...it, productId: r.product.id, title: r.product.title, brand: r.product.brand, grade: r.unit.grade as GradeKey,
      unitCode: r.unit.code, serialNumber: r.unit.serialNumber, batteryHealth: r.unit.batteryHealth,
      installedRamGb: r.unit.ramGb, installedSsdGb: r.unit.ssdGb, variantId: r.variant.id, unit,
    });
  }
  return { ok: true, lines: out };
}

export type Who = { userId: string | null; email: string | null; phone: string | null };

/** Looks up a coupon and checks every rule that doesn't depend on the cart total. */
export async function findCoupon(code: string | null | undefined, who: Who): Promise<{ coupon: Coupon | null; error: string | null }> {
  const c = (code ?? '').trim().toUpperCase();
  if (!c) return { coupon: null, error: null };
  const d = await db();
  const [row] = await d.select().from(coupons).where(eq(coupons.code, c)).limit(1);
  const now = new Date();
  if (!row || !row.active) return { coupon: null, error: 'That code isn’t valid.' };
  if (row.startsAt && row.startsAt > now) return { coupon: null, error: 'That code isn’t active yet.' };
  if (row.endsAt && row.endsAt < now) return { coupon: null, error: 'That code has expired.' };
  if (row.usageLimit != null && row.usedCount >= row.usageLimit) return { coupon: null, error: 'That code has been fully used.' };
  const mine = [
    who.userId ? eq(couponRedemptions.userId, who.userId) : undefined,
    who.email ? eq(couponRedemptions.email, who.email) : undefined,
    who.phone ? eq(couponRedemptions.phone, who.phone) : undefined,
  ].filter(Boolean);
  if (row.perUserLimit != null && mine.length) {
    const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(couponRedemptions).where(and(eq(couponRedemptions.code, c), or(...mine)));
    if (n >= row.perUserLimit) return { coupon: null, error: 'You’ve already used this code.' };
  }
  if (row.firstOrderOnly) {
    const conds = [
      who.userId ? eq(orders.userId, who.userId) : undefined,
      who.email ? eq(orders.email, who.email) : undefined,
      who.phone ? eq(orders.phone, who.phone) : undefined,
    ].filter(Boolean);
    if (conds.length) {
      const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(or(...conds), inArray(orders.paymentStatus, ['paid', 'cod_due', 'part_paid'])));
      if (n > 0) return { coupon: null, error: 'This code is for first orders only.' };
    }
  }
  return {
    coupon: { code: row.code, kind: row.kind, value: row.value, minSubtotal: row.minSubtotal, maxDiscount: row.maxDiscount, productIds: row.productIds, brands: row.brands },
    error: null,
  };
}

/** Quote for the checkout page: same maths as createOrder, without writing anything. */
export async function quote(who: Who, items: CheckoutItem[], couponCode: string | null, cod: boolean, buyerState?: string | null) {
  const priced = await priceItems(items);
  if (!priced.ok) return priced;
  const [student, found, s] = await Promise.all([who.userId ? isVerifiedStudent(who.userId) : false, findCoupon(couponCode, who), getSettings()]);
  const t = totals(priced.lines.map((l) => ({ unit: l.unit, qty: 1, productId: l.productId, brand: l.brand })), {
    student, coupon: found.coupon, cod, shipping: { flatFee: s.shipping.flatFee, freeAbove: s.shipping.freeAbove, codFee: s.shipping.codFee },
  });
  if (found.error) t.couponNote = found.error;
  const tax = gstFromInclusive(t.total, s.tax, buyerState);
  const codAllowed = s.shipping.codEnabled && t.total <= s.shipping.codMax;
  return { ok: true as const, lines: priced.lines, totals: t, tax, student, couponValid: couponCode ? !!found.coupon && !!t.couponCode : null, codAllowed, codMax: s.shipping.codMax };
}

function newNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const tail = Array.from(crypto.randomBytes(4), (b) => alphabet[b % alphabet.length]).join('');
  return `${BRAND.orderPrefix}-${ymd}-${tail}`;
}

/** Cancels online orders left unpaid and puts their units back on sale. Cheap; called before new orders. */
export async function releaseStaleOrders() {
  const d = await db();
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60_000);
  const stale = await d.select({ id: orders.id }).from(orders)
    .where(and(inArray(orders.status, ['awaiting_payment', 'payment_failed']), lt(orders.createdAt, cutoff)));
  for (const o of stale) await cancelOrder(o.id, `Not paid within ${HOLD_MINUTES} minutes`, null, { silent: true });
}

export async function createOrder(input: {
  userId: string | null; items: CheckoutItem[]; address: OrderAddress; email: string | null; phone: string;
  method: 'razorpay' | 'cod' | 'demo'; couponCode: string | null; gstin: string | null; name: string;
  /** Book with a small online payment now; the rest is paid on delivery. */
  book?: boolean;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  await releaseStaleOrders();
  const cod = input.method === 'cod';
  const book = !!input.book && !cod;
  const who: Who = { userId: input.userId, email: input.email, phone: input.phone };
  const q = await quote(who, input.items, input.couponCode, cod, input.address.state);
  if (!q.ok) return q;
  const s = await getSettings();
  if (s.shipping.blockedPinPrefixes.some((p) => input.address.pincode.startsWith(p))) return { ok: false, error: 'Sorry, we don’t deliver to this PIN code yet.' };
  if (cod && !q.codAllowed) return { ok: false, error: `Pay on delivery is available for orders up to ${rupees(s.shipping.codMax)}. Choose online payment.` };
  if (book && !s.shipping.bookingEnabled) return { ok: false, error: 'Booking isn’t available right now. Pay online or on delivery.' };
  const bookingAmount = book ? Math.min(s.shipping.bookingAmount, q.totals.total) : 0;
  const d = await db();
  try {
    const order = await d.transaction(async (tx) => {
      const [o] = await tx.insert(orders).values({
        number: newNumber(), userId: input.userId,
        status: cod ? 'confirmed' : 'awaiting_payment',
        paymentMethod: input.method, paymentStatus: cod ? 'cod_due' : 'pending',
        subtotal: q.totals.subtotal, studentDiscount: q.totals.studentDiscount,
        couponCode: q.totals.couponCode, couponDiscount: q.totals.couponDiscount,
        shippingFee: q.totals.shippingFee, codFee: q.totals.codFee, total: q.totals.total, taxAmount: q.tax.tax, bookingAmount,
        email: input.email, phone: input.phone, address: input.address, gstin: input.gstin, updatedAt: new Date(),
      }).returning();
      await reserveUnits(tx, q.lines.map((l) => l.unitId), o.id, cod ? null : new Date(Date.now() + HOLD_MINUTES * 60_000));
      await tx.insert(orderItems).values(q.lines.map((l, i) => ({
        orderId: o.id, productId: l.productId, variantId: l.variantId, title: l.title, grade: l.grade,
        ramGb: l.ramGb, ssdGb: l.ssdGb, warrantyMonths: l.warrantyMonths, unitPrice: l.unit, qty: 1,
        studentDiscount: q.totals.lineStudent[i] ?? 0,
        unitId: l.unitId, unitCode: l.unitCode, serialNumber: l.serialNumber, batteryHealth: l.batteryHealth,
      })));
      await tx.insert(payments).values({ orderId: o.id, provider: input.method, amount: dueOnline(o), status: cod ? 'cod_due' : 'created', method: cod ? 'cod' : null });
      await tx.insert(orderEvents).values({ orderId: o.id, status: 'placed', note: cod ? 'Placed with pay on delivery' : book ? `Placed, waiting for the ${rupees(bookingAmount)} booking payment` : 'Placed, waiting for payment' });
      if (cod) {
        await tx.insert(orderEvents).values({ orderId: o.id, status: 'confirmed', note: 'Confirmed for pay on delivery' });
        await sellUnits(tx, o.id);
      }
      if (q.totals.couponCode) {
        await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.code, q.totals.couponCode));
        await tx.insert(couponRedemptions).values({ code: q.totals.couponCode, orderId: o.id, userId: input.userId, email: input.email, phone: input.phone, amount: q.totals.couponDiscount });
      }
      return o;
    });
    invalidateProducts();
    if (cod) await afterConfirmed(order.id);
    return { ok: true, order };
  } catch (e) {
    if (e instanceof Error && e.message === 'SOLD_OUT') return { ok: false, error: 'A laptop in your cart was just bought by someone else. Your cart has been updated; review it and try again.' };
    throw e;
  }
}

/* ── Payment ───────────────────────────────────────────────── */

/** Marks an order paid. Safe to call more than once (browser callback and webhook). */
export async function markPaid(orderId: string, p: { provider: string; paymentId: string | null; providerOrderId?: string | null; method?: string | null; raw?: unknown }, note = 'Payment received'): Promise<boolean> {
  const d = await db();
  const ok = await d.transaction(async (tx) => {
    const [cur] = await tx.select({ total: orders.total, bookingAmount: orders.bookingAmount }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!cur) return false;
    const booking = cur.bookingAmount > 0;
    const res = await tx.update(orders)
      .set({ paymentStatus: booking ? 'part_paid' : 'paid', status: 'confirmed', razorpayPaymentId: p.paymentId, paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), inArray(orders.status, ['awaiting_payment', 'payment_failed'])))
      .returning({ id: orders.id });
    if (!res.length) return false;
    const [existing] = await tx.select().from(payments).where(and(eq(payments.orderId, orderId), inArray(payments.status, ['created', 'failed']))).orderBy(desc(payments.createdAt)).limit(1);
    if (existing) {
      await tx.update(payments).set({ status: 'captured', providerPaymentId: p.paymentId, providerOrderId: p.providerOrderId ?? existing.providerOrderId, method: p.method ?? existing.method, raw: p.raw ?? null, updatedAt: new Date() }).where(eq(payments.id, existing.id));
    } else {
      await tx.insert(payments).values({ orderId, provider: p.provider, providerOrderId: p.providerOrderId ?? null, providerPaymentId: p.paymentId, amount: dueOnline(cur), status: 'captured', method: p.method ?? null, raw: p.raw ?? null });
    }
    if (booking) await tx.insert(payments).values({ orderId, provider: 'cod', amount: cur.total - cur.bookingAmount, status: 'cod_due', method: 'cod' });
    // Units that were released (order paid after the hold expired) are re-reserved if still free.
    await sellUnits(tx, orderId);
    await tx.insert(orderEvents).values({ orderId, status: 'confirmed', note: booking ? `Booking amount of ${rupees(cur.bookingAmount)} received; ${rupees(cur.total - cur.bookingAmount)} to pay on delivery` : note });
    return true;
  });
  if (ok) { invalidateProducts(); await afterConfirmed(orderId); }
  return ok;
}

export async function markPaymentFailed(orderId: string, reason: string) {
  const d = await db();
  const res = await d.update(orders).set({ status: 'payment_failed', paymentStatus: 'failed', updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, 'awaiting_payment'))).returning();
  if (!res.length) return;
  await d.update(payments).set({ status: 'failed', errorReason: reason.slice(0, 300), updatedAt: new Date() }).where(and(eq(payments.orderId, orderId), eq(payments.status, 'created')));
  await d.insert(orderEvents).values({ orderId, status: 'payment_failed', note: reason.slice(0, 200) });
  const o = res[0];
  await notify('payment_failed', { email: o.email }, { name: o.address.name, order_number: o.number, order_url: orderUrl(o) }, o.number);
}

/* ── Cancel and status changes ─────────────────────────────── */

/** Cancels an order before it ships, puts its units back on sale and refunds online payments in full. */
export async function cancelOrder(orderId: string, reason: string, actor: Actor, opts: { silent?: boolean } = {}): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = await db();
  const o = await d.transaction(async (tx) => {
    const [row] = await tx.update(orders).set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: reason.slice(0, 300), updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), inArray(orders.status, ['awaiting_payment', 'payment_failed', 'confirmed', 'quality_check', 'packed'])))
      .returning();
    if (!row) return null;
    await releaseUnits(tx, orderId, `Order ${row.number} cancelled`);
    await tx.update(payments).set({ status: 'failed', errorReason: 'Order cancelled before payment', updatedAt: new Date() }).where(and(eq(payments.orderId, orderId), eq(payments.status, 'created')));
    await tx.update(payments).set({ status: 'cancelled', updatedAt: new Date() }).where(and(eq(payments.orderId, orderId), eq(payments.status, 'cod_due')));
    await tx.insert(orderEvents).values({ orderId, status: 'cancelled', note: reason, byUserId: actor?.user.id ?? null });
    return row;
  });
  if (!o) return { ok: false, error: 'This order can no longer be cancelled. If it has shipped, refuse the delivery or start a return.' };
  invalidateProducts();
  if (actor) await audit(actor, 'order.cancel', 'order', o.number, { reason });
  let refundNote = o.paymentMethod === 'cod' ? 'Nothing was charged.' : 'Nothing was charged.';
  const owed = ['paid', 'part_paid', 'partially_refunded'].includes(o.paymentStatus) ? await refundable(orderId) : 0;
  if (owed > 0) {
    const r = await refundOrder(orderId, owed, `Order cancelled: ${reason}`, actor);
    refundNote = r.ok ? `Your refund of ${rupees(owed)} has been started; banks take 5 to 7 working days.` : 'We will refund you in full and confirm by email.';
  }
  if (!opts.silent) await notify('order_cancelled', { email: o.email }, { name: o.address.name, order_number: o.number, reason, refund_note: refundNote, order_url: orderUrl(o) }, o.number);
  return { ok: true };
}

export async function setStatus(
  orderId: string, status: AdminStatus,
  extra: { carrier?: string; awb?: string; trackingUrl?: string; note?: string; location?: string },
  actor: Actor,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = await db();
  const [cur] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!cur) return { ok: false, error: 'Order not found.' };
  if (status === 'cancelled') return cancelOrder(orderId, extra.note || 'Cancelled by the store', actor);
  if (!(NEXT_STATUS[cur.status] ?? []).includes(status)) return { ok: false, error: `An order that is ${STATUS[cur.status]?.label.toLowerCase() ?? cur.status} can’t be marked ${STATUS[status]?.label.toLowerCase() ?? status}.` };
  if (status === 'shipped' && !(extra.awb?.trim())) return { ok: false, error: 'Enter the tracking (AWB) number.' };

  const now = new Date();
  const o = await d.transaction(async (tx) => {
    const patch: Partial<Order> = { status, updatedAt: now };
    if (status === 'shipped') Object.assign(patch, { shippedAt: now, courier: extra.carrier || null, trackingNumber: extra.awb!.trim(), trackingUrl: extra.trackingUrl || null });
    if (status === 'delivered') patch.deliveredAt = now;
    if (status === 'delivered' && ((cur.paymentMethod === 'cod' && cur.paymentStatus === 'cod_due') || cur.paymentStatus === 'part_paid')) Object.assign(patch, { paymentStatus: 'paid', paidAt: now });
    const [row] = await tx.update(orders).set(patch).where(eq(orders.id, orderId)).returning();

    // Shipment record
    const event: ShipmentEvent = { at: now.toISOString(), status, note: extra.note || null, location: extra.location || null };
    const [ship] = await tx.select().from(shipments).where(and(eq(shipments.orderId, orderId), eq(shipments.direction, 'forward'))).orderBy(desc(shipments.createdAt)).limit(1);
    const shipStatus = status === 'delivery_failed' ? 'failed' : status === 'returned' ? 'rto' : status;
    if (status === 'shipped') {
      if (ship) await tx.update(shipments).set({ carrier: extra.carrier || ship.carrier, awb: extra.awb!.trim(), trackingUrl: extra.trackingUrl || ship.trackingUrl, status: 'in_transit', events: [...ship.events, event], updatedAt: now }).where(eq(shipments.id, ship.id));
      else await tx.insert(shipments).values({ orderId, carrier: extra.carrier || null, awb: extra.awb!.trim(), trackingUrl: extra.trackingUrl || null, status: 'in_transit', events: [event] });
    } else if (ship && ['in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'returned'].includes(status)) {
      await tx.update(shipments).set({ status: shipStatus, events: [...ship.events, event], updatedAt: now, ...(status === 'delivered' ? { deliveredAt: now } : {}) }).where(eq(shipments.id, ship.id));
    }

    if (status === 'delivered') {
      if (cur.paymentMethod === 'cod' || cur.bookingAmount > 0) await tx.update(payments).set({ status: 'cod_collected', updatedAt: now }).where(and(eq(payments.orderId, orderId), eq(payments.status, 'cod_due')));
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const it of items) {
        const ends = new Date(now);
        ends.setMonth(ends.getMonth() + it.warrantyMonths);
        await tx.insert(warranties).values({ orderItemId: it.id, orderId, userId: row.userId, unitId: it.unitId, title: it.title, serialNumber: it.serialNumber, months: it.warrantyMonths, startsAt: now, endsAt: ends }).onConflictDoNothing();
      }
    }
    if (status === 'returned') {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const it of items) if (it.unitId) await markUnitReturned(tx, it.unitId, `Order ${row.number} returned`, actor?.user.id ?? null);
      await tx.update(warranties).set({ status: 'void' }).where(eq(warranties.orderId, orderId));
    }
    const shipNote = status === 'shipped' ? [extra.carrier, `AWB ${extra.awb}`].filter(Boolean).join(', ') : null;
    await tx.insert(orderEvents).values({ orderId, status, note: [shipNote, extra.note].filter(Boolean).join('. ') || null, byUserId: actor?.user.id ?? null });
    return row;
  });
  await audit(actor, 'order.status', 'order', o.number, { from: cur.status, to: status, ...extra });

  const vars = { name: o.address.name, order_number: o.number, order_url: orderUrl(o), courier: o.courier ?? 'our courier', awb: o.trackingNumber ?? '', tracking_url: o.trackingUrl ?? orderUrl(o), return_days: POLICY.returnDays, warranty_months: POLICY.warrantyMonths, review_url: `${BRAND.url}/account/orders/${o.number}#review` };
  if (status === 'shipped') await notify('order_shipped', { email: o.email, phone: o.phone }, vars, o.number);
  if (status === 'out_for_delivery') await notify('order_out_for_delivery', { phone: o.phone }, vars, o.number);
  if (status === 'delivered') await notify('order_delivered', { email: o.email, phone: o.phone }, vars, o.number);
  return { ok: true };
}

/* ── Refunds ───────────────────────────────────────────────── */

/** How much of an order can still be refunded. */
export async function refundable(orderId: string) {
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || o.paymentStatus === 'pending' || o.paymentStatus === 'failed' || o.paymentStatus === 'cod_due') return 0;
  const [{ sum }] = await d.select({ sum: sql<number>`coalesce(sum(${refunds.amount}),0)::int` }).from(refunds).where(and(eq(refunds.orderId, orderId), ne(refunds.status, 'failed')));
  return Math.max(0, (await amountPaid(orderId)) - sum);
}

/** What the customer pays online now: the booking amount for a booking order, otherwise the total. */
export function dueOnline(o: { total: number; bookingAmount: number }) {
  return o.bookingAmount > 0 ? o.bookingAmount : o.total;
}

/** Money actually received on an order (online and on delivery), before refunds. */
export async function amountPaid(orderId: string) {
  const d = await db();
  const [{ sum }] = await d.select({ sum: sql<number>`coalesce(sum(${payments.amount}),0)::int` }).from(payments)
    .where(and(eq(payments.orderId, orderId), inArray(payments.status, ['captured', 'partially_refunded', 'refunded', 'cod_collected'])));
  return sum;
}

/**
 * Refunds part or all of an order. Razorpay payments are refunded through Razorpay; pay-on-delivery
 * and demo payments are recorded as manual refunds for staff to pay by bank transfer or UPI.
 */
export async function refundOrder(orderId: string, amount: number, reason: string, actor: Actor, serviceRequestId?: number): Promise<{ ok: true; refund: Refund } | { ok: false; error: string }> {
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, error: 'Order not found.' };
  const max = await refundable(orderId);
  if (!(amount > 0)) return { ok: false, error: 'Enter an amount to refund.' };
  if (amount > max) return { ok: false, error: `At most ${rupees(max)} can be refunded on this order.` };
  // A booking order has two payments (online booking, balance on delivery): refund through the
  // online one when it can cover the amount, otherwise record a manual refund.
  const rows = await d.select().from(payments).where(and(eq(payments.orderId, orderId), inArray(payments.status, ['captured', 'partially_refunded', 'cod_collected']))).orderBy(payments.createdAt);
  const byRow = await d.select({ pid: refunds.paymentId, sum: sql<number>`coalesce(sum(${refunds.amount}),0)::int` }).from(refunds).where(and(eq(refunds.orderId, orderId), ne(refunds.status, 'failed'))).groupBy(refunds.paymentId);
  const left = (r: typeof rows[number]) => r.amount - (byRow.find((x) => x.pid === r.id)?.sum ?? 0);
  const pay = rows.find((r) => r.provider === 'razorpay' && left(r) >= amount) ?? rows.find((r) => left(r) >= amount) ?? rows[0];

  let status = 'manual';
  let providerRefundId: string | null = null;
  if (pay?.provider === 'razorpay' && pay.providerPaymentId && razorpayConfigured()) {
    try {
      const r = await refundPayment(pay.providerPaymentId, amount, { order: o.number, reason: reason.slice(0, 200) });
      providerRefundId = r.id;
      status = r.status === 'processed' ? 'processed' : 'pending';
    } catch (e) {
      console.error('refund', e);
      return { ok: false, error: `Razorpay refused the refund: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown error'}` };
    }
  } else if (pay?.provider === 'demo') status = 'processed';

  const refund = await d.transaction(async (tx) => {
    const [r] = await tx.insert(refunds).values({ orderId, paymentId: pay?.id ?? null, serviceRequestId: serviceRequestId ?? null, amount, reason, status, providerRefundId, byUserId: actor?.user.id ?? null, processedAt: status === 'processed' ? new Date() : null }).returning();
    const refundedAmount = o.refundedAmount + amount;
    const full = refundedAmount >= o.total || amount >= max;
    await tx.update(orders).set({ refundedAmount, paymentStatus: full ? 'refunded' : 'partially_refunded', updatedAt: new Date() }).where(eq(orders.id, orderId));
    if (pay) await tx.update(payments).set({ status: left(pay) - amount <= 0 ? 'refunded' : 'partially_refunded', updatedAt: new Date() }).where(eq(payments.id, pay.id));
    await tx.insert(orderEvents).values({ orderId, status: o.status, note: `Refund of ${rupees(amount)} ${status === 'manual' ? 'recorded (pay by bank transfer or UPI)' : status === 'processed' ? 'sent' : 'started'}: ${reason}`, byUserId: actor?.user.id ?? null });
    return r;
  });
  await audit(actor, 'refund.create', 'order', o.number, { amount, reason, status, providerRefundId });
  if (status === 'processed') await notify('refund_processed', { email: o.email, phone: o.phone }, { name: o.address.name, order_number: o.number, amount: rupees(amount), order_url: orderUrl(o) }, o.number);
  return { ok: true, refund };
}

/** A refund was completed (Razorpay webhook, or staff confirming a manual transfer). */
export async function markRefundProcessed(where: { providerRefundId?: string; refundId?: string }, actor: Actor = null) {
  const d = await db();
  const cond = where.providerRefundId ? eq(refunds.providerRefundId, where.providerRefundId) : eq(refunds.id, where.refundId!);
  const [r] = await d.update(refunds).set({ status: 'processed', processedAt: new Date() }).where(and(cond, inArray(refunds.status, ['pending', 'manual']))).returning();
  if (!r) return;
  const [o] = await d.select().from(orders).where(eq(orders.id, r.orderId)).limit(1);
  if (actor) await audit(actor, 'refund.processed', 'order', o?.number ?? r.orderId, { refundId: r.id, amount: r.amount });
  if (o) await notify('refund_processed', { email: o.email, phone: o.phone }, { name: o.address.name, order_number: o.number, amount: rupees(r.amount), order_url: orderUrl(o) }, o.number);
}

/* ── After confirmation ────────────────────────────────────── */

async function afterConfirmed(orderId: string) {
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return;
  const items = await d.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const list = items.map((i) => `${i.title}: ${GRADES[i.grade as GradeKey]?.label ?? i.grade} grade, ${gb(i.ramGb)} memory, ${gb(i.ssdGb)} SSD, unit ${i.unitCode ?? ''} (${rupees(i.unitPrice)})`).join('\n');
  const balance = rupees(o.total - o.bookingAmount);
  const payment = o.bookingAmount > 0 ? `booked with ${rupees(o.bookingAmount)}; ${balance} to pay on delivery, after you match the serial number` : o.paymentMethod === 'cod' ? 'to pay on delivery' : 'paid';
  await notify('order_confirmed', { email: o.email, phone: o.phone }, { name: o.address.name, order_number: o.number, items: list, total: rupees(o.total), payment, order_url: orderUrl(o) }, o.number);
  const inbox = process.env.ORDER_INBOX ?? process.env.CONTACT_INBOX ?? (await getSettings()).business.email;
  await notify('staff_new_order', { email: inbox }, {
    order_number: o.number, items: list, total: rupees(o.total), payment: o.bookingAmount > 0 ? `BOOKING: ${rupees(o.bookingAmount)} paid online, collect ${balance} on delivery. Video call the customer before dispatch.` : o.paymentMethod === 'cod' ? 'to collect on delivery' : 'paid online',
    ship_to: `${o.address.name}, ${o.address.city} ${o.address.pincode}`, admin_url: `${BRAND.url}/admin/orders/${o.number}`,
  }, o.number);
}

/* ── Reads ─────────────────────────────────────────────────── */

export async function orderByNumber(number: string) {
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!o) return null;
  const [items, events, pays, refs, ships, requests] = await Promise.all([
    d.select().from(orderItems).where(eq(orderItems.orderId, o.id)).orderBy(orderItems.id),
    d.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)).orderBy(orderEvents.createdAt, orderEvents.id),
    d.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(payments.createdAt),
    d.select().from(refunds).where(eq(refunds.orderId, o.id)).orderBy(refunds.createdAt),
    d.select().from(shipments).where(eq(shipments.orderId, o.id)).orderBy(shipments.createdAt),
    d.select().from(serviceRequests).where(eq(serviceRequests.orderId, o.id)).orderBy(desc(serviceRequests.createdAt)),
  ]);
  return { order: o, items, events, payments: pays, refunds: refs, shipments: ships, requests };
}
export type OrderBundle = NonNullable<Awaited<ReturnType<typeof orderByNumber>>>;

type ViewerLike = { user: { id: string; email: string | null; phone: string | null; emailVerifiedAt: Date | null; phoneVerifiedAt: Date | null } } | null;

/** Orders a customer can see: their own, plus guest orders placed with their verified email or phone. */
function ownership(v: NonNullable<ViewerLike>) {
  const guest = [
    v.user.email && v.user.emailVerifiedAt ? eq(orders.email, v.user.email) : undefined,
    v.user.phone && v.user.phoneVerifiedAt ? eq(orders.phone, v.user.phone) : undefined,
  ].filter(Boolean);
  return guest.length ? or(eq(orders.userId, v.user.id), and(isNull(orders.userId), or(...guest))) : eq(orders.userId, v.user.id);
}

export function canViewOrder(v: ViewerLike, o: Order, key?: string | null): boolean {
  if (checkGuestKey(o.id, key)) return true;
  if (!v) return false;
  if (o.userId === v.user.id) return true;
  if (!o.userId && ((v.user.emailVerifiedAt && o.email && o.email === v.user.email) || (v.user.phoneVerifiedAt && o.phone && o.phone === v.user.phone))) return true;
  return false;
}

export async function ordersForViewer(v: NonNullable<ViewerLike>, limit = 50) {
  const d = await db();
  const os = await d.select().from(orders).where(ownership(v)).orderBy(desc(orders.createdAt)).limit(limit);
  const items = os.length ? await d.select().from(orderItems).where(inArray(orderItems.orderId, os.map((o) => o.id))) : [];
  return os.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

/** Customer-facing recipient for an order. */
export async function orderEmail(o: Order) {
  if (o.email) return o.email;
  if (!o.userId) return null;
  const d = await db();
  const [u] = await d.select({ email: users.email }).from(users).where(eq(users.id, o.userId)).limit(1);
  return u?.email ?? null;
}

/**
 * A payment arrived for an order that was already cancelled (paid after the 30-minute hold).
 * If its laptops are still on sale the order is revived; otherwise the payment is refunded.
 */
export async function handleLatePayment(orderId: string, p: { paymentId: string; providerOrderId: string; method?: string | null; amount: number; raw?: unknown }) {
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || o.status !== 'cancelled' || o.paymentStatus === 'paid') return;
  const items = await d.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const unitIds = items.map((i) => i.unitId).filter((x): x is string => !!x);
  const revived = await d.transaction(async (tx) => {
    try {
      await reserveUnits(tx, unitIds, orderId, null);
    } catch {
      return false;
    }
    if (o.bookingAmount > 0) await tx.insert(payments).values({ orderId, provider: 'cod', amount: o.total - o.bookingAmount, status: 'cod_due', method: 'cod' });
    await tx.update(orders).set({ status: 'confirmed', paymentStatus: o.bookingAmount > 0 ? 'part_paid' : 'paid', paidAt: new Date(), razorpayPaymentId: p.paymentId, cancelledAt: null, cancelReason: null, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.insert(payments).values({ orderId, provider: 'razorpay', providerOrderId: p.providerOrderId, providerPaymentId: p.paymentId, amount: p.amount, status: 'captured', method: p.method ?? null, raw: p.raw ?? null }).onConflictDoNothing();
    await sellUnits(tx, orderId);
    await tx.insert(orderEvents).values({ orderId, status: 'confirmed', note: 'Paid after the hold expired; the laptop was still available, so the order was restored' });
    return true;
  });
  if (revived) { invalidateProducts(); await afterConfirmed(orderId); return; }
  await d.insert(payments).values({ orderId, provider: 'razorpay', providerOrderId: p.providerOrderId, providerPaymentId: p.paymentId, amount: p.amount, status: 'captured', method: p.method ?? null, raw: p.raw ?? null }).onConflictDoNothing();
  await d.update(orders).set({ paymentStatus: 'paid', razorpayPaymentId: p.paymentId, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await refundOrder(orderId, p.amount, 'Paid after the hold expired and the laptop had been sold', null);
}
