/**
 * Reviews come only from customers whose order with that model was delivered.
 * They are published after a staff member approves them. Aggregate ratings are shown only
 * when real approved reviews exist.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import { orderItems, orders, reviews } from './db/schema';

export type Review = typeof reviews.$inferSelect;

export async function approvedReviews(productId: string, limit = 20) {
  const d = await db();
  return d.select().from(reviews).where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved'))).orderBy(desc(reviews.createdAt)).limit(limit);
}

export async function ratingSummary(productId: string) {
  const d = await db();
  const rows = await d.select({ rating: reviews.rating, n: sql<number>`count(*)::int` }).from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved'))).groupBy(reviews.rating);
  const count = rows.reduce((a, r) => a + r.n, 0);
  if (!count) return null;
  const avg = rows.reduce((a, r) => a + r.rating * r.n, 0) / count;
  return { avg: Math.round(avg * 10) / 10, count, byStar: [5, 4, 3, 2, 1].map((s) => ({ star: s, n: rows.find((r) => r.rating === s)?.n ?? 0 })) };
}

/** Recent approved reviews across the store, for the home page. Only 4-5 star, with some text. */
export async function featuredReviews(limit = 6) {
  const d = await db();
  return d.select().from(reviews).where(and(eq(reviews.status, 'approved'), sql`${reviews.rating} >= 4`, sql`length(${reviews.body}) >= 40`)).orderBy(desc(reviews.createdAt)).limit(limit);
}

/** Products a user may review: delivered to them, not yet reviewed. */
export async function reviewable(userId: string) {
  const d = await db();
  const delivered = await d.select({ productId: orderItems.productId, title: orderItems.title, orderId: orders.id, number: orders.number })
    .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.userId, userId), inArray(orders.status, ['delivered'])));
  const mine = await d.select({ productId: reviews.productId }).from(reviews).where(eq(reviews.userId, userId));
  const done = new Set(mine.map((m) => m.productId));
  const seen = new Set<string>();
  return delivered.filter((x) => !done.has(x.productId) && !seen.has(x.productId) && seen.add(x.productId));
}
