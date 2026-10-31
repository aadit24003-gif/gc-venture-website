/**
 * Razorpay webhook: confirms payments even if the customer closed the tab.
 * Configure in Razorpay Dashboard → Webhooks with RAZORPAY_WEBHOOK_SECRET and events
 * payment.captured, payment.failed, refund.processed.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orderEvents, orders, webhookEvents } from '@/lib/db/schema';
import { markPaid, markPaymentFailed } from '@/lib/orders';
import { verifyWebhookSignature } from '@/lib/providers/razorpay';

export const dynamic = 'force-dynamic';

type Payload = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; error_description?: string; amount: number } };
    refund?: { entity: { id: string; payment_id: string; amount: number } };
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(raw, sig)) return new Response('bad signature', { status: 400 });

  const eventId = req.headers.get('x-razorpay-event-id') ?? `${Date.now()}-${Math.random()}`;
  const body = JSON.parse(raw) as Payload;
  const d = await db();
  const inserted = await d.insert(webhookEvents).values({ id: eventId, event: body.event, payload: body }).onConflictDoNothing().returning({ id: webhookEvents.id });
  if (!inserted.length) return Response.json({ ok: true, duplicate: true });

  const pay = body.payload.payment?.entity;
  if (pay?.order_id) {
    const [o] = await d.select().from(orders).where(eq(orders.razorpayOrderId, pay.order_id)).limit(1);
    if (o) {
      if (body.event === 'payment.captured' && pay.amount === o.total) await markPaid(o.id, pay.id, 'Payment confirmed by Razorpay');
      if (body.event === 'payment.failed') await markPaymentFailed(o.id, pay.error_description ?? 'Payment failed');
    }
  }
  const refund = body.payload.refund?.entity;
  if (body.event === 'refund.processed' && refund) {
    const [o] = await d.select().from(orders).where(eq(orders.razorpayPaymentId, refund.payment_id)).limit(1);
    if (o) {
      await d.update(orders).set({ paymentStatus: 'refunded' }).where(eq(orders.id, o.id));
      await d.insert(orderEvents).values({ orderId: o.id, status: o.status, note: `Refund of ₹${(refund.amount / 100).toLocaleString('en-IN')} processed` });
    }
  }
  return Response.json({ ok: true });
}
