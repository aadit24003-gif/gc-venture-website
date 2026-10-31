'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { coupons, messages, orders, products, studentVerifications, users, variants } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/session';
import { ADMIN_STATUSES, setStatus } from '@/lib/orders';
import { razorpayConfigured, refundPayment } from '@/lib/providers/razorpay';
import { orderEvents } from '@/lib/db/schema';
import { isDemo } from '@/lib/config';
import { rupees } from '@/lib/format';
import { invalidateProducts } from '@/lib/products';
import { approvedUntilFromNow } from '@/lib/students';
import { layout, sendEmail } from '@/lib/providers/email';
import { notifyApproved } from '@/lib/student-mail';
import { purgeStudentFiles } from '@/lib/students';

/* ── Orders ──────────────────────────────────────────────── */

const StatusInput = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ADMIN_STATUSES),
  courier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
  trackingUrl: z.string().trim().url().max(300).or(z.literal('')).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function updateOrderStatus(input: z.input<typeof StatusInput>) {
  const admin = await requireAdmin();
  const p = StatusInput.safeParse(input);
  if (!p.success) return { ok: false as const, error: p.error.issues[0].message };
  await setStatus(p.data.orderId, p.data.status, { ...p.data, trackingUrl: p.data.trackingUrl || undefined }, admin.user.id);
  const d = await db();
  const [o] = await d.select({ number: orders.number }).from(orders).where(eq(orders.id, p.data.orderId));
  revalidatePath(`/admin/orders/${o?.number}`);
  return { ok: true as const };
}

/** Refunds a paid online order in full: through Razorpay when connected, or recorded only in demo mode. */
export async function refundOrder(orderId: string) {
  const admin = await requireAdmin();
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false as const, error: 'Order not found.' };
  if (o.paymentStatus !== 'paid') return { ok: false as const, error: 'Only paid orders can be refunded.' };
  if (!['cancelled', 'returned'].includes(o.status)) return { ok: false as const, error: 'Cancel the order or mark it returned first.' };
  if (o.paymentMethod === 'cod') return { ok: false as const, error: 'Pay-on-delivery orders are refunded by bank transfer or UPI outside the store. Mark it here once done.' };
  let note = `Refund of ${rupees(o.total)} started`;
  if (o.paymentMethod === 'razorpay' && o.razorpayPaymentId && razorpayConfigured()) {
    try {
      const r = await refundPayment(o.razorpayPaymentId, o.total, { order: o.number });
      note += ` (Razorpay ${r.id})`;
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  } else if (!isDemo()) {
    return { ok: false as const, error: 'Razorpay is not connected, so refunds can’t be sent from here.' };
  } else note += ' (demo, no money moved)';
  await d.update(orders).set({ paymentStatus: 'refunded' }).where(eq(orders.id, o.id));
  await d.insert(orderEvents).values({ orderId: o.id, status: o.status, note, byUserId: admin.user.id });
  revalidatePath(`/admin/orders/${o.number}`);
  return { ok: true as const };
}

export async function saveAdminNote(orderId: string, note: string) {
  await requireAdmin();
  const d = await db();
  await d.update(orders).set({ adminNote: note.slice(0, 1000) }).where(eq(orders.id, orderId));
  return { ok: true as const };
}

/* ── Students ────────────────────────────────────────────── */

export async function decideStudent(id: number, decision: 'approve' | 'reject', reason?: string) {
  const admin = await requireAdmin();
  const d = await db();
  const [row] = await d.select().from(studentVerifications).where(eq(studentVerifications.id, id)).limit(1);
  if (!row || row.status !== 'pending') return { ok: false as const, error: 'Already decided.' };
  const [u] = await d.select().from(users).where(eq(users.id, row.userId)).limit(1);
  const to = u?.email ?? row.collegeEmail;

  if (decision === 'approve') {
    await d.update(studentVerifications).set({ status: 'approved', approvedUntil: approvedUntilFromNow(), reviewerId: admin.user.id, reviewedAt: new Date() }).where(eq(studentVerifications.id, id));
    if (to) await notifyApproved(to, row.fullName).catch(() => {});
  } else {
    const why = (reason ?? '').trim().slice(0, 200) || 'We could not confirm your student status from the details provided.';
    await d.update(studentVerifications).set({ status: 'rejected', rejectReason: why, reviewerId: admin.user.id, reviewedAt: new Date() }).where(eq(studentVerifications.id, id));
    if (to) {
      await sendEmail({
        to,
        subject: 'About your student verification',
        text: `Hi ${row.fullName}, we couldn't verify your student status: ${why} You can try again at any time with a clearer photo or your college email.`,
        html: layout('We couldn’t verify your student ID', `<p style="font-size:15px;line-height:1.6">Hi ${row.fullName}, we couldn’t verify your student status: <b>${why}</b></p><p style="font-size:15px;line-height:1.6">You can try again any time, with a clearer photo or with your college email.</p>`),
      }).catch(() => {});
    }
  }
  revalidatePath('/admin/students');
  return { ok: true as const };
}

/** Deletes ID photos for requests decided more than STUDENT.idRetentionDays ago. */
export async function purgeOldStudentFiles() {
  await requireAdmin();
  return purgeStudentFiles();
}

/* ── Products ────────────────────────────────────────────── */

const VariantEdit = z.object({ id: z.number().int(), price: z.number().int().min(100).max(10_00_000_00), stock: z.number().int().min(0).max(9999), active: z.boolean() });
const ProductEdit = z.object({
  id: z.string(),
  active: z.boolean(),
  featured: z.boolean(),
  newPrice: z.number().int().min(0).nullable(),
  variants: z.array(VariantEdit),
});

export async function saveProduct(input: z.input<typeof ProductEdit>) {
  await requireAdmin();
  const p = ProductEdit.safeParse(input);
  if (!p.success) return { ok: false as const, error: p.error.issues[0].message };
  const d = await db();
  await d.transaction(async (tx) => {
    await tx.update(products).set({ active: p.data.active, featured: p.data.featured, newPrice: p.data.newPrice, updatedAt: new Date() }).where(eq(products.id, p.data.id));
    for (const v of p.data.variants) {
      await tx.update(variants).set({ price: v.price, stock: v.stock, active: v.active }).where(and(eq(variants.id, v.id), eq(variants.productId, p.data.id)));
    }
  });
  invalidateProducts();
  revalidatePath('/admin/products');
  return { ok: true as const };
}

/* ── Coupons ─────────────────────────────────────────────── */

const CouponInput = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, 'Codes use 3–24 letters, numbers or dashes.'),
  kind: z.enum(['percent', 'flat']),
  value: z.number().positive(),
  minSubtotal: z.number().min(0),
  maxDiscount: z.number().positive().nullable(),
  usageLimit: z.number().int().positive().nullable(),
  endsAt: z.string().nullable(),
  note: z.string().trim().max(120).nullable(),
});

export async function createCoupon(input: z.input<typeof CouponInput>) {
  await requireAdmin();
  const p = CouponInput.safeParse(input);
  if (!p.success) return { ok: false as const, error: p.error.issues[0].message };
  const c = p.data;
  if (c.kind === 'percent' && c.value > 50) return { ok: false as const, error: 'Percentage coupons are capped at 50%.' };
  const d = await db();
  const [exists] = await d.select({ code: coupons.code }).from(coupons).where(eq(coupons.code, c.code));
  if (exists) return { ok: false as const, error: 'A coupon with this code already exists.' };
  await d.insert(coupons).values({
    code: c.code, kind: c.kind, value: c.kind === 'percent' ? Math.round(c.value) : Math.round(c.value * 100),
    minSubtotal: Math.round(c.minSubtotal * 100), maxDiscount: c.maxDiscount ? Math.round(c.maxDiscount * 100) : null,
    usageLimit: c.usageLimit, endsAt: c.endsAt ? new Date(`${c.endsAt}T23:59:59+05:30`) : null, note: c.note,
  });
  revalidatePath('/admin/coupons');
  return { ok: true as const };
}

export async function toggleCoupon(code: string, active: boolean) {
  await requireAdmin();
  const d = await db();
  await d.update(coupons).set({ active }).where(eq(coupons.code, code));
  revalidatePath('/admin/coupons');
  return { ok: true as const };
}

/* ── Messages ────────────────────────────────────────────── */

export async function markMessageHandled(id: number) {
  await requireAdmin();
  const d = await db();
  await d.update(messages).set({ handled: true }).where(eq(messages.id, id));
  return { ok: true as const };
}
