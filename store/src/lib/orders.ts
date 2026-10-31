/**
 * Orders: creation from a cart (prices recomputed here, never trusted from the browser),
 * stock reservation, payment confirmation, status changes and the emails that go with them.
 */
import crypto from 'node:crypto';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from './db';
import { coupons, orderEvents, orderItems, orders, products, users, variants, type OrderAddress } from './db/schema';
import { BRAND, CONTACT, GRADES, POLICY, type GradeKey } from './config';
import { isGrade, totals, unitPrice, type Coupon } from './pricing';
import { isVerifiedStudent } from './students';
import { formatDate, gb, rupees } from './format';
import { layout, sendEmail } from './providers/email';
import { invalidateProducts } from './products';

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;

export { STATUS, TIMELINE, ADMIN_STATUSES } from './order-status';
import { ADMIN_STATUSES } from './order-status';

/** Online orders not paid within this many minutes are cancelled and their stock released. */
const HOLD_MINUTES = 30;

export type CartInput = { productId: string; grade: string; ramGb: number; ssdGb: number; warrantyMonths: number; qty: number };

export type PricedLine = CartInput & { grade: GradeKey; title: string; unit: number; variantId: number; stock: number };

/** Validates a cart against the database. Returns priced lines or the first problem found. */
export async function priceCart(lines: CartInput[]): Promise<{ ok: true; lines: PricedLine[] } | { ok: false; error: string }> {
  if (!lines.length) return { ok: false, error: 'Your cart is empty.' };
  if (lines.length > 20) return { ok: false, error: 'Too many items in one order.' };
  const d = await db();
  const ids = [...new Set(lines.map((l) => l.productId))];
  const [ps, vs] = await Promise.all([
    d.select().from(products).where(and(inArray(products.id, ids), eq(products.active, true))),
    d.select().from(variants).where(inArray(variants.productId, ids)),
  ]);
  const out: PricedLine[] = [];
  for (const l of lines) {
    const p = ps.find((x) => x.id === l.productId);
    if (!p) return { ok: false, error: 'One of the laptops in your cart is no longer sold. Remove it and try again.' };
    if (!isGrade(l.grade)) return { ok: false, error: 'Unknown condition grade in your cart.' };
    const qty = Math.floor(l.qty);
    if (!(qty >= 1 && qty <= 5)) return { ok: false, error: 'You can order up to 5 of each laptop.' };
    const pv = vs.filter((v) => v.productId === p.id);
    const unit = unitPrice({ id: p.id, ramOptions: p.ramOptions, ssdOptions: p.ssdOptions, variants: pv }, l as CartInput & { grade: GradeKey });
    const v = pv.find((x) => x.grade === l.grade && x.active);
    if (unit == null || !v) return { ok: false, error: `The configuration chosen for ${p.title} is no longer available.` };
    const sameVariant = out.filter((o) => o.variantId === v.id).reduce((n, o) => n + o.qty, 0);
    if (v.stock < qty + sameVariant) {
      return { ok: false, error: v.stock > 0 ? `Only ${v.stock} ${p.title} (${GRADES[l.grade].label}) left. Lower the quantity to continue.` : `${p.title} in ${GRADES[l.grade].label} grade just sold out.` };
    }
    out.push({ ...l, grade: l.grade, qty, title: p.title, unit, variantId: v.id, stock: v.stock });
  }
  return { ok: true, lines: out };
}

export async function findCoupon(code: string | null | undefined): Promise<Coupon | null> {
  const c = (code ?? '').trim().toUpperCase();
  if (!c) return null;
  const d = await db();
  const [row] = await d.select().from(coupons).where(eq(coupons.code, c)).limit(1);
  if (!row || !row.active) return null;
  if (row.endsAt && row.endsAt < new Date()) return null;
  if (row.usageLimit != null && row.usedCount >= row.usageLimit) return null;
  return { code: row.code, kind: row.kind, value: row.value, minSubtotal: row.minSubtotal, maxDiscount: row.maxDiscount };
}

/** Quote for the checkout page: same maths as createOrder, without writing anything. */
export async function quote(userId: string | null, lines: CartInput[], couponCode: string | null, cod: boolean) {
  const priced = await priceCart(lines);
  if (!priced.ok) return priced;
  const student = userId ? await isVerifiedStudent(userId) : false;
  const coupon = await findCoupon(couponCode);
  const t = totals(priced.lines.map((l) => ({ unit: l.unit, qty: l.qty })), { student, coupon, cod });
  return { ok: true as const, lines: priced.lines, totals: t, student, couponValid: couponCode ? !!coupon : null };
}

function newNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const tail = Array.from(crypto.randomBytes(4), (b) => alphabet[b % alphabet.length]).join('');
  return `${BRAND.name.slice(0, 2).toUpperCase()}-${ymd}-${tail}`;
}

/** Cancels online orders left unpaid and puts their stock back. Cheap; called before new orders. */
export async function releaseStaleOrders() {
  const d = await db();
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60_000);
  const stale = await d.select({ id: orders.id }).from(orders)
    .where(and(inArray(orders.status, ['awaiting_payment', 'payment_failed']), lt(orders.createdAt, cutoff)));
  for (const o of stale) await cancelOrder(o.id, 'Not paid within 30 minutes', null);
}

export async function createOrder(input: {
  userId: string; lines: CartInput[]; address: OrderAddress; email: string | null; phone: string;
  method: 'razorpay' | 'cod' | 'demo'; couponCode: string | null; gstin: string | null;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  await releaseStaleOrders();
  const cod = input.method === 'cod';
  const q = await quote(input.userId, input.lines, input.couponCode, cod);
  if (!q.ok) return q;
  if (cod && (!POLICY.cod.enabled || q.totals.total > POLICY.cod.maxOrder)) {
    return { ok: false, error: `Pay on delivery is available for orders up to ${rupees(POLICY.cod.maxOrder)}. Choose online payment.` };
  }
  const d = await db();
  try {
    const order = await d.transaction(async (tx) => {
      // reserve stock; the WHERE stops it going negative if two people buy the last unit together
      for (const l of q.lines) {
        const res = await tx.update(variants).set({ stock: sql`${variants.stock} - ${l.qty}` })
          .where(and(eq(variants.id, l.variantId), sql`${variants.stock} >= ${l.qty}`)).returning({ id: variants.id });
        if (!res.length) throw new Error(`SOLD_OUT:${l.title}`);
      }
      const [o] = await tx.insert(orders).values({
        number: newNumber(), userId: input.userId,
        status: cod ? 'confirmed' : 'awaiting_payment',
        paymentMethod: input.method, paymentStatus: cod ? 'cod_due' : 'pending',
        subtotal: q.totals.subtotal, studentDiscount: q.totals.studentDiscount,
        couponCode: q.totals.couponCode, couponDiscount: q.totals.couponDiscount,
        shippingFee: q.totals.shippingFee, codFee: q.totals.codFee, total: q.totals.total,
        email: input.email, phone: input.phone, address: input.address, gstin: input.gstin,
      }).returning();
      await tx.insert(orderItems).values(q.lines.map((l, i) => ({
        orderId: o.id, productId: l.productId, variantId: l.variantId, title: l.title, grade: l.grade,
        ramGb: l.ramGb, ssdGb: l.ssdGb, warrantyMonths: l.warrantyMonths, unitPrice: l.unit, qty: l.qty,
        studentDiscount: q.totals.lineStudent[i] ?? 0,
      })));
      await tx.insert(orderEvents).values({ orderId: o.id, status: o.status, note: cod ? 'Placed with pay on delivery' : 'Placed, waiting for payment' });
      if (q.totals.couponCode) await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.code, q.totals.couponCode));
      return o;
    });
    invalidateProducts();
    if (cod) await sendConfirmation(order.id).catch((e) => console.error('confirmation email', e));
    return { ok: true, order };
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m.startsWith('SOLD_OUT:')) return { ok: false, error: `${m.slice(9)} just sold out. Remove it from your cart to continue.` };
    throw e;
  }
}

/** Marks an order paid. Safe to call more than once (browser callback and webhook). */
export async function markPaid(orderId: string, paymentId: string | null, note = 'Payment received'): Promise<boolean> {
  const d = await db();
  const res = await d.update(orders)
    .set({ paymentStatus: 'paid', status: 'confirmed', razorpayPaymentId: paymentId, paidAt: new Date() })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ['awaiting_payment', 'payment_failed'])))
    .returning({ id: orders.id });
  if (!res.length) return false;
  await d.insert(orderEvents).values({ orderId, status: 'confirmed', note });
  await sendConfirmation(orderId).catch((e) => console.error('confirmation email', e));
  return true;
}

export async function markPaymentFailed(orderId: string, reason: string) {
  const d = await db();
  const res = await d.update(orders).set({ status: 'payment_failed', paymentStatus: 'failed' })
    .where(and(eq(orders.id, orderId), eq(orders.status, 'awaiting_payment'))).returning({ id: orders.id });
  if (res.length) await d.insert(orderEvents).values({ orderId, status: 'payment_failed', note: reason.slice(0, 200) });
}

/** Cancels an order and returns its units to stock (once). */
export async function cancelOrder(orderId: string, note: string, byUserId: string | null) {
  const d = await db();
  await d.transaction(async (tx) => {
    const [o] = await tx.update(orders).set({ status: 'cancelled', cancelledAt: new Date() })
      .where(and(eq(orders.id, orderId), inArray(orders.status, ['awaiting_payment', 'payment_failed', 'confirmed', 'packed'])))
      .returning();
    if (!o) return;
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const it of items) await tx.update(variants).set({ stock: sql`${variants.stock} + ${it.qty}` }).where(eq(variants.id, it.variantId));
    await tx.insert(orderEvents).values({ orderId, status: 'cancelled', note, byUserId });
  });
  invalidateProducts();
}

export async function setStatus(orderId: string, status: (typeof ADMIN_STATUSES)[number], extra: { courier?: string; trackingNumber?: string; trackingUrl?: string; note?: string }, byUserId: string) {
  if (status === 'cancelled') return cancelOrder(orderId, extra.note || 'Cancelled by the store', byUserId);
  const d = await db();
  const patch: Partial<Order> = { status };
  if (status === 'shipped') {
    patch.shippedAt = new Date();
    if (extra.courier) patch.courier = extra.courier;
    if (extra.trackingNumber) patch.trackingNumber = extra.trackingNumber;
    if (extra.trackingUrl) patch.trackingUrl = extra.trackingUrl;
  }
  if (status === 'delivered') patch.deliveredAt = new Date();
  const [o] = await d.update(orders).set(patch).where(eq(orders.id, orderId)).returning();
  if (!o) return;
  if (status === 'delivered' && o.paymentMethod === 'cod') await d.update(orders).set({ paymentStatus: 'paid', paidAt: new Date() }).where(eq(orders.id, orderId));
  const shipNote = status === 'shipped' && (o.courier || o.trackingNumber) ? [o.courier, o.trackingNumber && `tracking ${o.trackingNumber}`].filter(Boolean).join(', ') : null;
  await d.insert(orderEvents).values({ orderId, status, note: [shipNote, extra.note].filter(Boolean).join('. ') || null, byUserId });
  if (status === 'shipped' || status === 'delivered') await sendStatusEmail(o).catch((e) => console.error('status email', e));
}

/* ── Reads ─────────────────────────────────────────────────── */

export async function orderByNumber(number: string) {
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!o) return null;
  const [items, events] = await Promise.all([
    d.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    d.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)).orderBy(orderEvents.createdAt),
  ]);
  return { order: o, items, events };
}

export async function ordersForUser(userId: string) {
  const d = await db();
  const os = await d.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(50);
  const items = os.length ? await d.select().from(orderItems).where(inArray(orderItems.orderId, os.map((o) => o.id))) : [];
  return os.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

/* ── Emails ────────────────────────────────────────────────── */

async function recipient(o: Order) {
  if (o.email) return o.email;
  const d = await db();
  const [u] = await d.select({ email: users.email }).from(users).where(eq(users.id, o.userId)).limit(1);
  return u?.email ?? null;
}

async function sendConfirmation(orderId: string) {
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return;
  const items = await d.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  await notifyStore(o, items).catch((e) => console.error('store notification', e));
  const to = await recipient(o);
  if (!to) return;
  const rows = items.map((i) => `<tr><td style="padding:8px 0;font-size:14px">${i.qty} × ${i.title}<br><span style="color:#5C6B66">${GRADES[i.grade as GradeKey]?.label ?? i.grade} grade, ${gb(i.ramGb)} memory, ${gb(i.ssdGb)} SSD</span></td><td style="padding:8px 0;text-align:right;font-size:14px">${rupees(i.unitPrice * i.qty)}</td></tr>`).join('');
  const discount = o.studentDiscount + o.couponDiscount;
  await sendEmail({
    to,
    subject: `Order ${o.number} confirmed`,
    text: `Thanks for your order ${o.number}. Total ${rupees(o.total)}${o.paymentMethod === 'cod' ? ', to pay on delivery' : ', paid'}. We'll email you when it ships. Track it at ${BRAND.url}/orders/${o.number}`,
    html: layout(`Thanks, your order is confirmed`, `<p style="font-size:15px;line-height:1.6">Order <b>${o.number}</b>, placed ${formatDate(o.createdAt)}. We test every laptop once more before it leaves, and email you the tracking link when it ships.</p>
<table width="100%" style="border-top:1px solid #D3DAD2;border-bottom:1px solid #D3DAD2;margin:18px 0">${rows}</table>
${discount ? `<p style="font-size:14px;margin:4px 0">Discounts: −${rupees(discount)}</p>` : ''}
<p style="font-size:17px;margin:4px 0"><b>Total ${rupees(o.total)}</b> ${o.paymentMethod === 'cod' ? '(pay on delivery)' : '(paid)'}</p>
<p style="margin-top:22px"><a href="${BRAND.url}/orders/${o.number}" style="background:#0F3D33;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Track your order</a></p>`),
  });
}

/** Tells the store a new order is ready to pack. Goes to ORDER_INBOX, CONTACT_INBOX or the contact email. */
async function notifyStore(o: Order, items: OrderItem[]) {
  const to = process.env.ORDER_INBOX ?? process.env.CONTACT_INBOX ?? CONTACT.email;
  const list = items.map((i) => `${i.qty} × ${i.title} (${GRADES[i.grade as GradeKey]?.label ?? i.grade}, ${gb(i.ramGb)}, ${gb(i.ssdGb)}, ${i.warrantyMonths}-month warranty)`).join('\n');
  await sendEmail({
    to,
    subject: `New order ${o.number}: ${rupees(o.total)}${o.paymentMethod === 'cod' ? ' (pay on delivery)' : ''}`,
    text: `${list}\n\nShip to ${o.address.name}, ${o.address.city} ${o.address.pincode}.\nOpen: ${BRAND.url}/admin/orders/${o.number}`,
    html: layout(`New order ${o.number}`, `<p style="font-size:15px;line-height:1.6;white-space:pre-line">${list}</p><p style="font-size:15px">Ship to <b>${o.address.name}</b>, ${o.address.city} ${o.address.pincode}. Total <b>${rupees(o.total)}</b>, ${o.paymentMethod === 'cod' ? 'to collect on delivery' : 'paid online'}.</p><p><a href="${BRAND.url}/admin/orders/${o.number}" style="color:#0F3D33;font-weight:bold">Open in admin</a></p>`),
  });
}

async function sendStatusEmail(o: Order) {
  const to = await recipient(o);
  if (!to) return;
  const shipped = o.status === 'shipped';
  await sendEmail({
    to,
    subject: shipped ? `Order ${o.number} has shipped` : `Order ${o.number} was delivered`,
    text: shipped ? `Your order ${o.number} is on its way${o.courier ? ` with ${o.courier}` : ''}${o.trackingNumber ? `, tracking ${o.trackingNumber}` : ''}.` : `Your order ${o.number} was delivered. Your ${POLICY.warrantyMonths}-month warranty starts today.`,
    html: layout(shipped ? 'Your laptop is on its way' : 'Delivered', shipped
      ? `<p style="font-size:15px;line-height:1.6">Order <b>${o.number}</b> left our workshop${o.courier ? ` with <b>${o.courier}</b>` : ''}.${o.trackingNumber ? ` Tracking number: <b>${o.trackingNumber}</b>.` : ''}</p>${o.trackingUrl ? `<p><a href="${o.trackingUrl}" style="color:#0F3D33;font-weight:bold">Follow the parcel</a></p>` : ''}`
      : `<p style="font-size:15px;line-height:1.6">Order <b>${o.number}</b> was delivered. You have ${POLICY.returnDays} days to return it if something isn't right, and your warranty starts today.</p>`),
  });
}
