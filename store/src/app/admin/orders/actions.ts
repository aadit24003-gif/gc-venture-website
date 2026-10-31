'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orderEvents, orders, payments } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { ADMIN_STATUSES } from '@/lib/order-status';
import { markPaid, markRefundProcessed, refundOrder, setStatus, dueOnline } from '@/lib/orders';
import { orderPayments, razorpayConfigured } from '@/lib/providers/razorpay';
import { audit } from '@/lib/audit';

type R = { ok: true; message?: string } | { ok: false; error: string };
const deny: R = { ok: false, error: 'Your role can’t do that.' };

const StatusInput = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ADMIN_STATUSES),
  carrier: z.string().trim().max(60).optional(),
  awb: z.string().trim().max(60).optional(),
  trackingUrl: z.string().trim().url().max(300).or(z.literal('')).optional(),
  note: z.string().trim().max(300).optional(),
  location: z.string().trim().max(80).optional(),
});

export async function updateOrderStatus(input: z.input<typeof StatusInput>): Promise<R> {
  const v = await staffCan('orders.manage');
  if (!v) return deny;
  const p = StatusInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const r = await setStatus(p.data.orderId, p.data.status, { ...p.data, trackingUrl: p.data.trackingUrl || undefined }, v);
  revalidatePath('/admin/orders', 'layout');
  return r;
}

export async function issueRefund(orderId: string, amountRupees: number, reason: string): Promise<R> {
  const v = await staffCan('refunds.manage');
  if (!v) return deny;
  if (!reason.trim()) return { ok: false, error: 'Give a reason for the refund.' };
  const r = await refundOrder(orderId, Math.round(amountRupees * 100), reason.trim().slice(0, 200), v);
  revalidatePath('/admin/orders', 'layout');
  return r.ok ? { ok: true, message: r.refund.status === 'manual' ? 'Refund recorded. Pay it by bank transfer or UPI, then mark it sent.' : 'Refund started.' } : r;
}

export async function confirmManualRefund(refundId: string): Promise<R> {
  const v = await staffCan('refunds.manage');
  if (!v) return deny;
  await markRefundProcessed({ refundId }, v);
  revalidatePath('/admin/orders', 'layout');
  return { ok: true, message: 'Marked as sent. The customer has been told.' };
}

export async function saveAdminNote(orderId: string, note: string): Promise<R> {
  const v = await staffCan('orders.view');
  if (!v) return deny;
  const d = await db();
  const [o] = await d.update(orders).set({ adminNote: note.slice(0, 2000), updatedAt: new Date() }).where(eq(orders.id, orderId)).returning({ number: orders.number });
  await audit(v, 'order.note', 'order', o?.number ?? orderId, { note: note.slice(0, 200) });
  return { ok: true, message: 'Note saved.' };
}

/** Asks Razorpay whether an unpaid order was actually paid (e.g. the webhook never arrived). */
export async function reconcilePayment(orderId: string): Promise<R> {
  const v = await staffCan('orders.manage');
  if (!v) return deny;
  if (!razorpayConfigured()) return { ok: false, error: 'Razorpay is not connected.' };
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o?.razorpayOrderId) return { ok: false, error: 'This order never reached Razorpay.' };
  const list = await orderPayments(o.razorpayOrderId);
  const captured = list.find((p) => p.status === 'captured' && p.amount === dueOnline(o));
  await audit(v, 'payment.reconcile', 'order', o.number, { found: list.map((p) => ({ id: p.id, status: p.status })) });
  if (!captured) return { ok: true, message: list.length ? `Razorpay shows ${list.length} attempt(s), none captured.` : 'Razorpay has no payment for this order.' };
  if (o.paymentStatus === 'paid' || o.paymentStatus === 'part_paid') {
    await d.update(payments).set({ method: captured.method }).where(eq(payments.providerPaymentId, captured.id));
    return { ok: true, message: 'Already marked paid; details refreshed.' };
  }
  const done = await markPaid(o.id, { provider: 'razorpay', paymentId: captured.id, providerOrderId: o.razorpayOrderId, method: captured.method }, 'Payment found by reconciliation');
  revalidatePath('/admin/orders', 'layout');
  return done ? { ok: true, message: 'Payment found and the order is confirmed.' } : { ok: false, error: 'Payment found, but the order was already cancelled. Refund it or contact the customer.' };
}

/** Books the shipment with Shiprocket (when configured) and marks the order shipped. */
export async function shipWithShiprocket(orderId: string): Promise<R> {
  const v = await staffCan('orders.manage');
  if (!v) return deny;
  const { shiprocketConfigured, createShiprocketShipment } = await import('@/lib/shipping');
  if (!shiprocketConfigured()) return { ok: false, error: 'Shiprocket is not connected. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD, or enter the AWB by hand.' };
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || o.status !== 'packed') return { ok: false, error: 'Mark the order packed first.' };
  try {
    const s = await createShiprocketShipment(o);
    const r = await setStatus(o.id, 'shipped', { carrier: s.carrier, awb: s.awb, trackingUrl: s.trackingUrl, note: s.labelUrl ? `Label: ${s.labelUrl}` : undefined }, v);
    revalidatePath('/admin/orders', 'layout');
    return r.ok ? { ok: true, message: `Booked with ${s.carrier}, AWB ${s.awb}.${s.labelUrl ? ' Label link is in the history.' : ''}` } : r;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : 'Shiprocket failed.' };
  }
}

/** Records that staff showed the customer their laptop and its serial number on a video call. */
export async function markVideoCall(orderId: string): Promise<R> {
  const v = await staffCan('orders.manage');
  if (!v) return deny;
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: 'Order not found.' };
  const d = await db();
  const [o] = await d.update(orders).set({ videoCallAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId)).returning();
  if (!o) return { ok: false, error: 'Order not found.' };
  await d.insert(orderEvents).values({ orderId, status: o.status, note: 'Video call done: laptop and serial number shown to the customer', byUserId: v.user.id });
  await audit(v, 'order.video_call', 'order', o.number, {});
  revalidatePath(`/admin/orders/${o.number}`);
  return { ok: true, message: 'Video call recorded.' };
}
