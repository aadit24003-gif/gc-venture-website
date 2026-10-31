/**
 * Razorpay Standard Checkout.
 * Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (test keys start with rzp_test_) and
 * RAZORPAY_WEBHOOK_SECRET (Dashboard → Webhooks, URL: <site>/api/razorpay/webhook,
 * events: payment.captured, payment.failed, refund.processed).
 *
 * Flow: the server creates a Razorpay order for the exact total → the browser opens
 * Checkout → Razorpay returns payment id + signature → the server verifies the
 * signature before marking the order paid. The webhook covers closed tabs.
 */
import crypto from 'node:crypto';

export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? '';

function auth() {
  return 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
}

export type RzpOrder = { id: string; amount: number; currency: string; status: string; receipt: string };

export async function createRazorpayOrder(input: { amount: number; receipt: string; notes?: Record<string, string> }): Promise<RzpOrder> {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: input.amount, currency: 'INR', receipt: input.receipt, notes: input.notes ?? {} }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as RzpOrder;
}

export type RzpPayment = { id: string; status: string; amount: number; method: string; order_id: string };

/** Payments made against a Razorpay order (used to reconcile when the browser never reported back). */
export async function orderPayments(rzpOrderId: string): Promise<RzpPayment[]> {
  const res = await fetch(`https://api.razorpay.com/v1/orders/${rzpOrderId}/payments`, { headers: { Authorization: auth() } });
  if (!res.ok) throw new Error(`Razorpay payments lookup failed (${res.status})`);
  const body = (await res.json()) as { items: RzpPayment[] };
  return body.items ?? [];
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET ?? '').update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}
