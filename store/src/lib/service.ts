/**
 * Returns, replacements, complaints and warranty claims, with their history.
 */
import crypto from 'node:crypto';
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from './db';
import { orderItems, orders, serviceEvents, serviceRequests, warranties } from './db/schema';
import { BRAND, POLICY } from './config';
import { notify } from './notify';
import { audit } from './audit';

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type ServiceKind = 'return' | 'replacement' | 'complaint' | 'warranty';

export const KIND_LABEL: Record<ServiceKind, string> = { return: 'Return', replacement: 'Replacement', complaint: 'Complaint', warranty: 'Warranty claim' };

export const SERVICE_STATUS: Record<string, { label: string; tone: 'wait' | 'ok' | 'done' | 'bad' | 'info'; customer: string }> = {
  requested: { label: 'Requested', tone: 'wait', customer: 'We have your request and will reply within one working day.' },
  approved: { label: 'Approved', tone: 'ok', customer: 'Approved. We’ll arrange a pickup.' },
  pickup_scheduled: { label: 'Pickup scheduled', tone: 'ok', customer: 'A courier will collect the laptop. Pack it with its charger.' },
  received: { label: 'Received', tone: 'ok', customer: 'The laptop reached our workshop.' },
  inspected: { label: 'Inspected', tone: 'ok', customer: 'We’ve checked the laptop and are finishing up.' },
  repaired: { label: 'Repaired', tone: 'done', customer: 'Repaired and on its way back to you.' },
  replaced: { label: 'Replaced', tone: 'done', customer: 'A replacement unit is on its way.' },
  refunded: { label: 'Refunded', tone: 'done', customer: 'Refunded. Banks take 5 to 7 working days to show it.' },
  resolved: { label: 'Resolved', tone: 'done', customer: 'Resolved.' },
  rejected: { label: 'Declined', tone: 'bad', customer: 'We couldn’t accept this request. See the note below.' },
  cancelled: { label: 'Withdrawn', tone: 'info', customer: 'You withdrew this request.' },
};
export const OPEN_SERVICE = ['requested', 'approved', 'pickup_scheduled', 'received', 'inspected'];
export const SERVICE_NEXT: Record<string, string[]> = {
  requested: ['approved', 'rejected', 'resolved'],
  approved: ['pickup_scheduled', 'received', 'resolved', 'rejected'],
  pickup_scheduled: ['received', 'cancelled'],
  received: ['inspected', 'repaired', 'replaced', 'refunded', 'rejected'],
  inspected: ['repaired', 'replaced', 'refunded', 'rejected', 'resolved'],
};

function newNumber() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return `SR-${Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('')}`;
}

/** Whether a delivered order item can still be returned / replaced / claimed under warranty. */
export function eligibility(o: { status: string; deliveredAt: Date | null }, w: { endsAt: Date; status: string } | null) {
  const days = o.deliveredAt ? (Date.now() - o.deliveredAt.getTime()) / 86_400_000 : null;
  return {
    return: o.status === 'delivered' && days != null && days <= POLICY.returnDays,
    replacement: o.status === 'delivered' && days != null && days <= POLICY.returnDays,
    warranty: o.status === 'delivered' && !!w && w.status === 'active' && w.endsAt > new Date(),
    complaint: !['awaiting_payment', 'payment_failed'].includes(o.status),
    daysLeftToReturn: days == null ? null : Math.max(0, Math.ceil(POLICY.returnDays - days)),
  };
}

export async function createServiceRequest(input: {
  userId: string | null; orderId: string; orderItemId: number | null; kind: ServiceKind; reason: string; details: string; photos: string[]; email: string | null; name: string;
}): Promise<{ ok: true; request: ServiceRequest } | { ok: false; error: string }> {
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!o) return { ok: false, error: 'Order not found.' };
  let unitId: string | null = null;
  let w: typeof warranties.$inferSelect | null = null;
  if (input.orderItemId) {
    const [it] = await d.select().from(orderItems).where(and(eq(orderItems.id, input.orderItemId), eq(orderItems.orderId, o.id))).limit(1);
    if (!it) return { ok: false, error: 'Choose the laptop this is about.' };
    unitId = it.unitId;
    [w] = await d.select().from(warranties).where(eq(warranties.orderItemId, it.id)).limit(1);
  }
  const el = eligibility(o, w ?? null);
  if (input.kind === 'return' && !el.return) return { ok: false, error: `Returns are possible within ${POLICY.returnDays} days of delivery. For a fault, make a warranty claim instead.` };
  if (input.kind === 'replacement' && !el.replacement) return { ok: false, error: `Replacements are possible within ${POLICY.returnDays} days of delivery. For a fault, make a warranty claim instead.` };
  if (input.kind === 'warranty' && !el.warranty) return { ok: false, error: 'This laptop has no active warranty.' };
  if (input.kind !== 'complaint' && !input.orderItemId) return { ok: false, error: 'Choose the laptop this is about.' };
  const open = await d.select({ id: serviceRequests.id }).from(serviceRequests)
    .where(and(eq(serviceRequests.orderId, o.id), input.orderItemId ? eq(serviceRequests.orderItemId, input.orderItemId) : undefined, eq(serviceRequests.kind, input.kind), inArray(serviceRequests.status, OPEN_SERVICE))).limit(1);
  if (open.length) return { ok: false, error: 'There is already an open request like this for this laptop. You can follow it in your account.' };

  const [r] = await d.insert(serviceRequests).values({
    number: newNumber(), kind: input.kind, userId: input.userId, orderId: o.id, orderItemId: input.orderItemId, unitId,
    reason: input.reason.slice(0, 120), details: input.details.slice(0, 4000), photos: input.photos.slice(0, 6),
  }).returning();
  await d.insert(serviceEvents).values({ requestId: r.id, status: 'requested', note: input.reason, byUserId: input.userId });
  await notify('service_update', { email: input.email ?? o.email }, {
    name: input.name, request_number: r.number, kind: KIND_LABEL[input.kind], status: SERVICE_STATUS.requested.label,
    note: SERVICE_STATUS.requested.customer, request_url: `${BRAND.url}/account/requests/${r.number}`,
  }, r.number);
  return { ok: true, request: r };
}

type Actor = Parameters<typeof audit>[0];

export async function updateServiceRequest(id: number, input: { status?: string; note?: string; internal?: boolean; resolution?: string }, actor: Actor): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = await db();
  const [r] = await d.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  if (!r) return { ok: false, error: 'Request not found.' };
  if (input.status && input.status !== r.status && !(SERVICE_NEXT[r.status] ?? []).includes(input.status)) {
    return { ok: false, error: `A request that is ${SERVICE_STATUS[r.status]?.label.toLowerCase()} can’t move to ${SERVICE_STATUS[input.status]?.label.toLowerCase() ?? input.status}.` };
  }
  const status = input.status ?? r.status;
  const closed = !OPEN_SERVICE.includes(status);
  await d.update(serviceRequests).set({
    status, updatedAt: new Date(), ...(input.resolution != null ? { resolution: input.resolution } : {}),
    ...(closed && !r.closedAt ? { closedAt: new Date() } : {}),
  }).where(eq(serviceRequests.id, id));
  await d.insert(serviceEvents).values({ requestId: id, status, note: input.note || null, internal: !!input.internal, byUserId: actor?.user.id ?? null });
  await audit(actor, 'service.update', 'service_request', r.number, input);
  if (!input.internal && (input.status || input.note)) {
    const [o] = await d.select().from(orders).where(eq(orders.id, r.orderId)).limit(1);
    if (o) await notify('service_update', { email: o.email }, {
      name: o.address.name, request_number: r.number, kind: KIND_LABEL[r.kind as ServiceKind], status: SERVICE_STATUS[status]?.label ?? status,
      note: input.note || SERVICE_STATUS[status]?.customer || '', request_url: `${BRAND.url}/account/requests/${r.number}`,
    }, r.number);
  }
  return { ok: true };
}

export async function requestsForUser(userId: string, orderIds: string[]) {
  const d = await db();
  const cond = orderIds.length ? inArray(serviceRequests.orderId, orderIds) : eq(serviceRequests.userId, userId);
  return d.select().from(serviceRequests).where(cond).orderBy(desc(serviceRequests.createdAt));
}

export async function requestByNumber(number: string) {
  const d = await db();
  const [r] = await d.select().from(serviceRequests).where(eq(serviceRequests.number, number)).limit(1);
  if (!r) return null;
  const [events, [o], items] = await Promise.all([
    d.select().from(serviceEvents).where(eq(serviceEvents.requestId, r.id)).orderBy(serviceEvents.createdAt),
    d.select().from(orders).where(eq(orders.id, r.orderId)).limit(1),
    r.orderItemId ? d.select().from(orderItems).where(eq(orderItems.id, r.orderItemId)) : Promise.resolve([]),
  ]);
  return { request: r, events, order: o, item: items[0] ?? null };
}

export async function openRequestCount() {
  const d = await db();
  return (await d.select({ id: serviceRequests.id }).from(serviceRequests).where(notInArray(serviceRequests.status, ['refunded', 'replaced', 'repaired', 'resolved', 'rejected', 'cancelled']))).length;
}
