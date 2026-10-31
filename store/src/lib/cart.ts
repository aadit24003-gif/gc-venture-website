/**
 * Carts are stored in the database. A guest's cart is found through an http-only cookie;
 * a signed-in customer's cart belongs to their account, and a guest cart joins it on sign-in.
 * Each line is one specific unit; adding a unit does not reserve it (checkout does).
 */
import { cookies } from 'next/headers';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { cartItems, carts, inventoryUnits, products, variants, type ProductImage, type ArtSpec } from './db/schema';
import { getViewer } from './auth/session';
import { linePrice, upgradeChoices, warrantyCost } from './pricing';
import { POLICY, type GradeKey } from './config';

const COOKIE = 'cart';
const MAX_LINES = 10;

export type CartLine = {
  itemId: number; unitId: string; unitCode: string; productId: string; slug: string; title: string; brand: string;
  image: ProductImage | null; art: ArtSpec; grade: GradeKey;
  ramGb: number; ssdGb: number; warrantyMonths: number; installedRamGb: number; installedSsdGb: number;
  batteryHealth: number | null; cosmeticNotes: string | null;
  basePrice: number | null; price: number | null; available: boolean; problem: string | null;
  ramChoices: { gb: number; extra: number }[]; ssdChoices: { gb: number; extra: number }[];
};
export type CartView = { lines: CartLine[]; count: number; subtotal: number };
export const EMPTY_CART: CartView = { lines: [], count: 0, subtotal: 0 };

async function findCartId(create: boolean): Promise<string | null> {
  const d = await db();
  const v = await getViewer();
  if (v) {
    const [c] = await d.select({ id: carts.id }).from(carts).where(eq(carts.userId, v.user.id)).limit(1);
    if (c) return c.id;
    if (!create) return null;
    const [n] = await d.insert(carts).values({ userId: v.user.id }).onConflictDoNothing().returning({ id: carts.id });
    if (n) return n.id;
    const [again] = await d.select({ id: carts.id }).from(carts).where(eq(carts.userId, v.user.id)).limit(1);
    return again?.id ?? null;
  }
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id && /^[0-9a-f-]{36}$/.test(id)) {
    const [c] = await d.select({ id: carts.id, userId: carts.userId }).from(carts).where(eq(carts.id, id)).limit(1);
    if (c && !c.userId) return c.id;
  }
  if (!create) return null;
  const [n] = await d.insert(carts).values({}).returning({ id: carts.id });
  jar.set(COOKIE, n.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 86_400 });
  return n.id;
}

export async function getCart(): Promise<CartView> {
  const id = await findCartId(false);
  return id ? viewCart(id) : EMPTY_CART;
}

async function viewCart(cartId: string): Promise<CartView> {
  const d = await db();
  const rows = await d.select({ item: cartItems, unit: inventoryUnits, product: products, gradePrice: variants.price, gradeActive: variants.active })
    .from(cartItems)
    .innerJoin(inventoryUnits, eq(inventoryUnits.id, cartItems.unitId))
    .innerJoin(products, eq(products.id, inventoryUnits.productId))
    .leftJoin(variants, and(eq(variants.productId, inventoryUnits.productId), eq(variants.grade, inventoryUnits.grade)))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(cartItems.addedAt);
  const lines: CartLine[] = rows.map(({ item, unit, product, gradePrice, gradeActive }) => {
    const base = unit.price ?? (gradeActive ? gradePrice : null);
    const available = unit.status === 'available' && product.active && base != null;
    const price = base == null ? null : linePrice({ price: base, ramGb: unit.ramGb, ssdGb: unit.ssdGb }, product, item);
    let problem: string | null = null;
    if (!product.active) problem = 'No longer sold.';
    else if (unit.status === 'reserved' || unit.status === 'sold') problem = 'Someone else just bought this unit.';
    else if (unit.status !== 'available') problem = 'This unit was taken off sale.';
    else if (price == null) problem = 'This configuration is no longer offered. Change it or remove the laptop.';
    return {
      itemId: item.id, unitId: unit.id, unitCode: unit.code, productId: product.id, slug: product.slug, title: product.title, brand: product.brand,
      image: product.images[0] ?? null, art: product.art, grade: unit.grade as GradeKey,
      ramGb: item.ramGb, ssdGb: item.ssdGb, warrantyMonths: item.warrantyMonths, installedRamGb: unit.ramGb, installedSsdGb: unit.ssdGb,
      batteryHealth: unit.batteryHealth, cosmeticNotes: unit.cosmeticNotes,
      basePrice: base, price, available: available && price != null, problem,
      ramChoices: upgradeChoices(product.ramOptions, unit.ramGb), ssdChoices: upgradeChoices(product.ssdOptions, unit.ssdGb),
    };
  });
  const ok = lines.filter((l) => l.available);
  return { lines, count: lines.length, subtotal: ok.reduce((n, l) => n + (l.price ?? 0), 0) };
}

export type Selection = { ramGb: number; ssdGb: number; warrantyMonths: number };

async function validSelection(unitId: string, sel: Selection) {
  const d = await db();
  const [row] = await d.select({ unit: inventoryUnits, product: products }).from(inventoryUnits)
    .innerJoin(products, eq(products.id, inventoryUnits.productId)).where(eq(inventoryUnits.id, unitId)).limit(1);
  if (!row) return { ok: false as const, error: 'That laptop was not found.' };
  if (row.unit.status !== 'available' || !row.product.active) return { ok: false as const, error: 'Sorry, this unit was just sold. Pick another one.' };
  const ram = upgradeChoices(row.product.ramOptions, row.unit.ramGb).some((c) => c.gb === sel.ramGb);
  const ssd = upgradeChoices(row.product.ssdOptions, row.unit.ssdGb).some((c) => c.gb === sel.ssdGb);
  if (!ram || !ssd || warrantyCost(sel.warrantyMonths) == null) return { ok: false as const, error: 'That configuration isn’t offered for this unit.' };
  return { ok: true as const };
}

export async function addToCart(unitId: string, sel: Selection): Promise<{ ok: true; cart: CartView } | { ok: false; error: string }> {
  const check = await validSelection(unitId, sel);
  if (!check.ok) return check;
  const cartId = (await findCartId(true))!;
  const d = await db();
  const existing = await d.select({ id: cartItems.id, unitId: cartItems.unitId }).from(cartItems).where(eq(cartItems.cartId, cartId));
  if (!existing.some((e) => e.unitId === unitId) && existing.length >= MAX_LINES) return { ok: false, error: `A cart can hold up to ${MAX_LINES} laptops. For more, ask us about a business order.` };
  await d.insert(cartItems).values({ cartId, unitId, ...sel })
    .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.unitId], set: { ramGb: sel.ramGb, ssdGb: sel.ssdGb, warrantyMonths: sel.warrantyMonths } });
  await d.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
  return { ok: true, cart: await viewCart(cartId) };
}

export async function updateCartItem(itemId: number, sel: Selection): Promise<{ ok: true; cart: CartView } | { ok: false; error: string }> {
  const cartId = await findCartId(false);
  if (!cartId) return { ok: false, error: 'Your cart is empty.' };
  const d = await db();
  const [it] = await d.select().from(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId))).limit(1);
  if (!it) return { ok: false, error: 'That item is no longer in your cart.' };
  const check = await validSelection(it.unitId, sel);
  if (!check.ok) return check;
  await d.update(cartItems).set(sel).where(eq(cartItems.id, itemId));
  return { ok: true, cart: await viewCart(cartId) };
}

export async function removeFromCart(itemId: number): Promise<CartView> {
  const cartId = await findCartId(false);
  if (!cartId) return EMPTY_CART;
  const d = await db();
  await d.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  return viewCart(cartId);
}

/** Removes units from the current cart (after an order is placed). */
export async function removeUnitsFromCart(unitIds: string[]) {
  const cartId = await findCartId(false);
  if (!cartId || !unitIds.length) return;
  const d = await db();
  await d.delete(cartItems).where(and(eq(cartItems.cartId, cartId), inArray(cartItems.unitId, unitIds)));
}

/** On sign-in: moves the guest cart's units into the account's cart. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const guestId = jar.get(COOKIE)?.value;
  if (!guestId || !/^[0-9a-f-]{36}$/.test(guestId)) return;
  const d = await db();
  const [guest] = await d.select().from(carts).where(eq(carts.id, guestId)).limit(1);
  jar.delete(COOKIE);
  if (!guest || guest.userId) return;
  let [mine] = await d.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  if (!mine) {
    await d.update(carts).set({ userId, updatedAt: new Date() }).where(eq(carts.id, guest.id));
    return;
  }
  const items = await d.select().from(cartItems).where(eq(cartItems.cartId, guest.id));
  for (const it of items) {
    await d.insert(cartItems).values({ cartId: mine.id, unitId: it.unitId, ramGb: it.ramGb, ssdGb: it.ssdGb, warrantyMonths: it.warrantyMonths }).onConflictDoNothing();
  }
  await d.delete(carts).where(eq(carts.id, guest.id));
  [mine] = await d.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, mine.id)).returning();
}

/** Lines ready for checkout, in the shape the order code expects. */
export async function checkoutLines() {
  const cart = await getCart();
  return {
    cart,
    items: cart.lines.filter((l) => l.available).map((l) => ({ unitId: l.unitId, ramGb: l.ramGb, ssdGb: l.ssdGb, warrantyMonths: l.warrantyMonths })),
  };
}

export const DEFAULT_WARRANTY = POLICY.warrantyMonths;
