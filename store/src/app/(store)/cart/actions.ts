'use server';

import { z } from 'zod';
import { addToCart, getCart, removeFromCart, updateCartItem, type CartView } from '@/lib/cart';

const Sel = z.object({ ramGb: z.number().int().positive(), ssdGb: z.number().int().positive(), warrantyMonths: z.number().int().positive() });

export type CartResult = { ok: true; cart: CartView } | { ok: false; error: string };

export async function addToCartAction(unitId: string, sel: { ramGb: number; ssdGb: number; warrantyMonths: number }): Promise<CartResult> {
  const s = Sel.safeParse(sel);
  if (!z.string().uuid().safeParse(unitId).success || !s.success) return { ok: false, error: 'That choice could not be read. Refresh the page.' };
  return addToCart(unitId, s.data);
}

export async function updateCartAction(itemId: number, sel: { ramGb: number; ssdGb: number; warrantyMonths: number }): Promise<CartResult> {
  const s = Sel.safeParse(sel);
  if (!Number.isInteger(itemId) || !s.success) return { ok: false, error: 'That choice could not be read.' };
  return updateCartItem(itemId, s.data);
}

export async function removeCartAction(itemId: number): Promise<CartResult> {
  if (!Number.isInteger(itemId)) return { ok: false, error: 'Unknown item.' };
  return { ok: true, cart: await removeFromCart(itemId) };
}

export async function refreshCartAction(): Promise<CartView> {
  return getCart();
}
