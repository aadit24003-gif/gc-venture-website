/**
 * Shipping providers. "manual" (default): staff book the courier themselves and type the AWB.
 * "shiprocket": serviceability checks, shipment creation with AWB and label, and tracking updates
 * by webhook. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD (an API user from Shiprocket →
 * Settings → API), SHIPROCKET_PICKUP_LOCATION (the pickup location name) and, for the webhook,
 * SHIPROCKET_WEBHOOK_TOKEN. [CONFIRM] Untested until real credentials are added.
 */
import { eq } from 'drizzle-orm';
import { db } from './db';
import { orderItems, orders, shipments } from './db/schema';
import type { Order } from './orders';

const API = 'https://apiv2.shiprocket.in/v1/external';
export const shiprocketConfigured = () => !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);

let token: { value: string; at: number } | null = null;
async function auth(): Promise<string> {
  if (token && Date.now() - token.at < 8 * 86_400_000) return token.value; // tokens last 10 days
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }), signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Shiprocket sign-in failed (${res.status})`);
  const j = (await res.json()) as { token: string };
  token = { value: j.token, at: Date.now() };
  return j.token;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await auth()}`, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Shiprocket ${path} failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
  return body as T;
}

/** Couriers available between the pickup and delivery PIN codes; null if not configured or it fails. */
export async function serviceability(pickup: string, delivery: string, cod: boolean, weightKg = 2.5) {
  if (!shiprocketConfigured()) return null;
  try {
    const q = new URLSearchParams({ pickup_postcode: pickup, delivery_postcode: delivery, weight: String(weightKg), cod: cod ? '1' : '0' });
    const j = await call<{ data?: { available_courier_companies?: { courier_name: string; estimated_delivery_days: string; cod: number }[] } }>(`/courier/serviceability/?${q}`);
    const list = j.data?.available_courier_companies ?? [];
    return { serviceable: list.length > 0, cod: list.some((c) => c.cod === 1), fastestDays: list.length ? Math.min(...list.map((c) => Number(c.estimated_delivery_days) || 99)) : null };
  } catch (e) {
    console.error('serviceability', e);
    return null;
  }
}

/** Creates the Shiprocket order and shipment, assigns an AWB and requests a label. */
export async function createShiprocketShipment(o: Order): Promise<{ carrier: string; awb: string; trackingUrl: string; labelUrl: string | null }> {
  const d = await db();
  const items = await d.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  const [first, ...rest] = o.address.name.split(' ');
  const cod = o.paymentMethod === 'cod' && o.paymentStatus !== 'paid';
  const created = await call<{ order_id: number; shipment_id: number }>('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify({
      order_id: o.number, order_date: o.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary',
      billing_customer_name: first, billing_last_name: rest.join(' ') || '.', billing_address: o.address.line1, billing_address_2: [o.address.line2, o.address.landmark].filter(Boolean).join(', '),
      billing_city: o.address.city, billing_pincode: o.address.pincode, billing_state: o.address.state, billing_country: 'India',
      billing_email: o.email ?? '', billing_phone: o.address.phone, shipping_is_billing: true,
      order_items: items.map((i) => ({ name: i.title, sku: i.unitCode ?? i.productId, units: i.qty, selling_price: Math.round((i.unitPrice - i.studentDiscount) / 100), hsn: 8471 })),
      payment_method: cod ? 'COD' : 'Prepaid', sub_total: Math.round(o.total / 100),
      length: 40, breadth: 30, height: 8, weight: Math.max(2.5, items.length * 2.5),
    }),
  });
  const awb = await call<{ response?: { data?: { awb_code?: string; courier_name?: string } } }>('/courier/assign/awb', { method: 'POST', body: JSON.stringify({ shipment_id: created.shipment_id }) });
  const code = awb.response?.data?.awb_code;
  if (!code) throw new Error('Shiprocket did not assign an AWB. Check courier availability for this PIN code.');
  await call('/courier/generate/pickup', { method: 'POST', body: JSON.stringify({ shipment_id: [created.shipment_id] }) }).catch((e) => console.error('pickup', e));
  const label = await call<{ label_url?: string }>('/courier/generate/label', { method: 'POST', body: JSON.stringify({ shipment_id: [created.shipment_id] }) }).catch(() => ({ label_url: undefined }));
  return { carrier: awb.response?.data?.courier_name ?? 'Shiprocket', awb: code, trackingUrl: `https://shiprocket.co/tracking/${code}`, labelUrl: label.label_url ?? null };
}

/** Maps Shiprocket's status text to our order statuses. */
export function mapShiprocketStatus(s: string): 'in_transit' | 'out_for_delivery' | 'delivered' | 'delivery_failed' | 'returned' | null {
  const t = s.toUpperCase();
  if (t.includes('OUT FOR DELIVERY')) return 'out_for_delivery';
  if (t === 'DELIVERED') return 'delivered';
  if (t.includes('RTO DELIVERED')) return 'returned';
  if (t.includes('UNDELIVERED') || t.includes('FAILED') || t.includes('NDR')) return 'delivery_failed';
  if (t.includes('TRANSIT') || t.includes('PICKED UP') || t.includes('SHIPPED') || t.includes('REACHED')) return 'in_transit';
  return null;
}

export async function orderByAwb(awb: string) {
  const d = await db();
  const [s] = await d.select().from(shipments).where(eq(shipments.awb, awb)).limit(1);
  if (!s) return null;
  const [o] = await d.select().from(orders).where(eq(orders.id, s.orderId)).limit(1);
  return o ?? null;
}
