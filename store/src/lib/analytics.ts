/**
 * Dashboard numbers, all computed from the database for a date range.
 * Profit is reported only for units with a recorded purchase cost, and says how many that covers.
 */
import { and, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from './db';
import { inventoryUnits, orderItems, orders, productViews, products, refunds, serviceRequests, studentVerifications, tickets, users } from './db/schema';
import { OPEN_SERVICE } from './service';

export type Range = { from: Date; to: Date };

/** Revenue-bearing orders: paid online, pay-on-delivery confirmed, or delivered. */
const COUNTED = ['paid', 'cod_due', 'partially_refunded', 'refunded'];

const istDay = (col: unknown) => sql<string>`to_char((${col} at time zone 'Asia/Kolkata'), 'YYYY-MM-DD')`;

export async function analytics(r: Range) {
  const d = await db();
  const inRange = and(gte(orders.createdAt, r.from), lt(orders.createdAt, r.to));
  const counted = and(inRange, inArray(orders.paymentStatus, COUNTED));

  const [totalsRow] = await d.select({
    orders: sql<number>`count(*)::int`,
    gross: sql<number>`coalesce(sum(${orders.total}),0)::bigint`,
    refunded: sql<number>`coalesce(sum(${orders.refundedAmount}),0)::bigint`,
    discounts: sql<number>`coalesce(sum(${orders.studentDiscount} + ${orders.couponDiscount}),0)::bigint`,
    tax: sql<number>`coalesce(sum(${orders.taxAmount}),0)::bigint`,
  }).from(orders).where(counted);

  const byStatus = await d.select({ status: orders.status, n: sql<number>`count(*)::int` }).from(orders).where(inRange).groupBy(orders.status);

  const daily = await d.select({ day: istDay(orders.createdAt), revenue: sql<number>`coalesce(sum(${orders.total} - ${orders.refundedAmount}),0)::bigint`, orders: sql<number>`count(*)::int` })
    .from(orders).where(counted).groupBy(istDay(orders.createdAt)).orderBy(istDay(orders.createdAt));

  const items = await d.select({
    productId: orderItems.productId, title: orderItems.title, unitPrice: orderItems.unitPrice, student: orderItems.studentDiscount,
    brand: products.brand, cost: inventoryUnits.purchaseCost,
  }).from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .leftJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(inventoryUnits, eq(inventoryUnits.id, orderItems.unitId))
    .where(and(counted, sql`${orders.status} <> 'cancelled'`));

  const byBrand = new Map<string, { units: number; revenue: number }>();
  const byProduct = new Map<string, { title: string; units: number; revenue: number }>();
  let costed = 0, costedRevenue = 0, cost = 0;
  for (const it of items) {
    const rev = it.unitPrice - it.student;
    const b = byBrand.get(it.brand ?? 'Other') ?? { units: 0, revenue: 0 };
    b.units++; b.revenue += rev; byBrand.set(it.brand ?? 'Other', b);
    const p = byProduct.get(it.productId) ?? { title: it.title, units: 0, revenue: 0 };
    p.units++; p.revenue += rev; byProduct.set(it.productId, p);
    if (it.cost != null) { costed++; costedRevenue += rev; cost += it.cost; }
  }

  const [refundRow] = await d.select({ n: sql<number>`count(*)::int`, sum: sql<number>`coalesce(sum(${refunds.amount}),0)::bigint` })
    .from(refunds).where(and(gte(refunds.createdAt, r.from), lt(refunds.createdAt, r.to), sql`${refunds.status} <> 'failed'`));

  const fromDay = new Date(r.from.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const toDay = new Date(r.to.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const [viewsRow] = await d.select({ n: sql<number>`coalesce(sum(${productViews.views}),0)::int` }).from(productViews)
    .where(and(gte(productViews.day, fromDay), lt(productViews.day, toDay)));

  const [custRow] = await d.select({ n: sql<number>`count(*)::int` }).from(users).where(and(gte(users.createdAt, r.from), lt(users.createdAt, r.to), eq(users.role, 'customer')));

  const inv = await d.select({
    status: inventoryUnits.status, n: sql<number>`count(*)::int`,
    cost: sql<number>`coalesce(sum(${inventoryUnits.purchaseCost}),0)::bigint`,
    withCost: sql<number>`count(${inventoryUnits.purchaseCost})::int`,
    avgAge: sql<number>`coalesce(avg(extract(epoch from (now() - coalesce(${inventoryUnits.listedAt}, ${inventoryUnits.createdAt}))) / 86400),0)::float`,
  }).from(inventoryUnits).groupBy(inventoryUnits.status);

  const aging = await d.select({
    bucket: sql<string>`case when now() - coalesce(${inventoryUnits.listedAt}, ${inventoryUnits.createdAt}) < interval '15 days' then '0–14 days' when now() - coalesce(${inventoryUnits.listedAt}, ${inventoryUnits.createdAt}) < interval '31 days' then '15–30 days' when now() - coalesce(${inventoryUnits.listedAt}, ${inventoryUnits.createdAt}) < interval '61 days' then '31–60 days' else '61+ days' end`,
    n: sql<number>`count(*)::int`,
  }).from(inventoryUnits).where(eq(inventoryUnits.status, 'available')).groupBy(sql`1`);

  const gross = Number(totalsRow.gross), refunded = Number(totalsRow.refunded);
  return {
    orders: totalsRow.orders,
    revenue: gross - refunded,
    gross, refunded,
    discounts: Number(totalsRow.discounts),
    tax: Number(totalsRow.tax),
    aov: totalsRow.orders ? Math.round((gross - refunded) / totalsRow.orders) : 0,
    unitsSold: items.length,
    byStatus,
    daily: daily.map((x) => ({ day: x.day, revenue: Number(x.revenue), orders: x.orders })),
    byBrand: [...byBrand.entries()].map(([brand, v]) => ({ brand, ...v })).sort((a, b) => b.revenue - a.revenue),
    topProducts: [...byProduct.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 8),
    profit: costed ? { units: costed, of: items.length, revenue: costedRevenue, cost, margin: costedRevenue - cost } : null,
    refunds: { n: refundRow.n, sum: Number(refundRow.sum) },
    views: viewsRow.n,
    conversion: viewsRow.n ? totalsRow.orders / viewsRow.n : null,
    newCustomers: custRow.n,
    inventory: inv.map((x) => ({ status: x.status, n: x.n, cost: Number(x.cost), withCost: x.withCost, avgAge: Math.round(x.avgAge) })),
    aging,
  };
}

/** Work waiting for staff right now. */
export async function workQueue() {
  const d = await db();
  const [[toShip], [awaitingPay], [returns], [openTickets], [students], [lowStock]] = await Promise.all([
    d.select({ n: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, ['confirmed', 'quality_check', 'packed'])),
    d.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, 'awaiting_payment')),
    d.select({ n: sql<number>`count(*)::int` }).from(serviceRequests).where(inArray(serviceRequests.status, OPEN_SERVICE)),
    d.select({ n: sql<number>`count(*)::int` }).from(tickets).where(eq(tickets.status, 'open')),
    d.select({ n: sql<number>`count(*)::int` }).from(studentVerifications).where(eq(studentVerifications.status, 'pending')),
    d.select({ n: sql<number>`count(*)::int` }).from(inventoryUnits).where(and(inArray(inventoryUnits.status, ['intake', 'inspection', 'refurbishing']), isNotNull(inventoryUnits.id))),
  ]);
  return { toShip: toShip.n, awaitingPay: awaitingPay.n, returns: returns.n, tickets: openTickets.n, students: students.n, inWorkshop: lowStock.n };
}
