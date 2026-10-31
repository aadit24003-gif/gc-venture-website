/** Wishlist and recently viewed, stored per account. */
import { and, desc, eq, notInArray, sql } from 'drizzle-orm';
import { db } from './db';
import { recentViews, wishlists } from './db/schema';

export async function wishlistIds(userId: string): Promise<string[]> {
  const d = await db();
  return (await d.select({ id: wishlists.productId }).from(wishlists).where(eq(wishlists.userId, userId)).orderBy(desc(wishlists.createdAt))).map((r) => r.id);
}

export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  const d = await db();
  const del = await d.delete(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))).returning({ id: wishlists.id });
  if (del.length) return false;
  await d.insert(wishlists).values({ userId, productId }).onConflictDoNothing();
  return true;
}

export async function recordView(userId: string, productId: string) {
  const d = await db();
  await d.insert(recentViews).values({ userId, productId }).onConflictDoUpdate({ target: [recentViews.userId, recentViews.productId], set: { viewedAt: sql`now()` } });
  // keep the 30 most recent
  const keep = await d.select({ id: recentViews.id }).from(recentViews).where(eq(recentViews.userId, userId)).orderBy(desc(recentViews.viewedAt)).limit(30);
  if (keep.length === 30) await d.delete(recentViews).where(and(eq(recentViews.userId, userId), notInArray(recentViews.id, keep.map((k) => k.id))));
}

export async function recentIds(userId: string, limit = 12): Promise<string[]> {
  const d = await db();
  return (await d.select({ id: recentViews.productId }).from(recentViews).where(eq(recentViews.userId, userId)).orderBy(desc(recentViews.viewedAt)).limit(limit)).map((r) => r.id);
}
