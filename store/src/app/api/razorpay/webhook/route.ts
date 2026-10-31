/**
 * Razorpay webhook: confirms payments even if the customer closed the tab, and tracks refunds.
 * Configure in Razorpay Dashboard → Webhooks with RAZORPAY_WEBHOOK_SECRET and events
 * payment.captured, payment.failed, refund.processed, refund.failed.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, refunds, webhookEvents } from '@/lib/db/schema';
import { handleLatePayment, markPaid, markPaymentFailed, markRefundProcessed, dueOnline } from '@/lib/orders';
import { verifyWebhookSignature } from '@/lib/providers/razorpay';

export const dynamic = 'force-dynamic';

type Payload = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; error_description?: string; amount: number; method?: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status?: string } };
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(raw, sig)) return new Response('bad signature', { status: 400 });

  const body = JSON.parse(raw) as Payload;
  const eventId = req.headers.get('x-razorpay-event-id') ?? `${body.event}:${body.payload.payment?.entity.id ?? body.payload.refund?.entity.id ?? Date.now()}`;
  const d = await db();
  const inserted = await d.insert(webhookEvents).values({ id: eventId, event: body.event, payload: body }).onConflictDoNothing().returning({ id: webhookEvents.id });
  if (!inserted.length) return Response.json({ ok: true, duplicate: true });

  const pay = body.payload.payment?.entity;
  if (pay?.order_id) {
    const [o] = await d.select().from(orders).where(eq(orders.razorpayOrderId, pay.order_id)).limit(1);
    if (o) {
      if (body.event === 'payment.captured' && pay.amount === dueOnline(o)) {
        const info = { provider: 'razorpay', paymentId: pay.id, providerOrderId: pay.order_id, method: pay.method ?? null, raw: pay };
        const done = await markPaid(o.id, info, 'Payment confirmed by Razorpay');
        if (!done && o.status === 'cancelled') await handleLatePayment(o.id, { paymentId: pay.id, providerOrderId: pay.order_id, method: pay.method, amount: pay.amount, raw: pay });
      }
      if (body.event === 'payment.failed') await markPaymentFailed(o.id, pay.error_description ?? 'Payment failed');
    }
  }
  const refund = body.payload.refund?.entity;
  if (refund) {
    if (body.event === 'refund.processed') await markRefundProcessed({ providerRefundId: refund.id });
    if (body.event === 'refund.failed') await d.update(refunds).set({ status: 'failed' }).where(and(eq(refunds.providerRefundId, refund.id), eq(refunds.status, 'pending')));
  }
  return Response.json({ ok: true });
}
