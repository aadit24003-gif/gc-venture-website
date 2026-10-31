'use server';

import { getViewer } from '@/lib/auth/session';
import { toggleWishlist } from '@/lib/shopping';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function toggleWishlistAction(productId: string): Promise<{ ok: true; on: boolean } | { ok: false; error: string; signIn?: boolean }> {
  const v = await getViewer();
  if (!v) return { ok: false, error: 'Sign in to save laptops to your wishlist.', signIn: true };
  const d = await db();
  const [p] = await d.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!p) return { ok: false, error: 'That laptop was not found.' };
  return { ok: true, on: await toggleWishlist(v.user.id, productId) };
}
