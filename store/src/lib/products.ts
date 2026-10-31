/**
 * Catalogue reads. Availability and prices come from the units actually on sale.
 */
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import { orderItems, orders, productViews, products, reviews, variants } from './db/schema';
import { GRADE_ORDER, type GradeKey } from './config';
import { availableUnits, type PublicUnit } from './inventory';

export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type ProductFull = Product & { variants: Variant[]; units: PublicUnit[]; popularity: number; rating: { avg: number; count: number } | null };

/** Small card-sized view of a product, safe to send to the browser. */
export type CardProduct = {
  id: string; slug: string; title: string; brand: string; family: string; model: string; year: number | null;
  cpu: string; cpuShort: string; cpuTier: string; cpuGen: number | null; ramGb: number; ssdGb: number; maxRamGb: number;
  screenIn: number; screenRes: string; weightKg: number | null; uses: string[]; categories: string[]; tags: string[];
  art: Product['art']; image: Product['images'][number] | null; featured: boolean; newPrice: number | null;
  /** Lowest price among units on sale, or among grade prices when none are on sale. */
  fromPrice: number; fromGrade: GradeKey;
  grades: { grade: GradeKey; price: number | null; stock: number }[];
  /** Memory and storage across units on sale (for filters). */
  ramOn: number[]; ssdOn: number[];
  unitsOnSale: number; bestBattery: number | null; inStock: boolean;
  sort: number; createdAt: string; newestListing: string | null; popularity: number;
  rating: { avg: number; count: number } | null;
};

let cache: { at: number; rows: ProductFull[] } | null = null;
const TTL = 15_000;

/** All active products with grade prices, units on sale, popularity and rating; cached briefly. */
export async function allProducts(): Promise<ProductFull[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  const d = await db();
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const since90 = new Date(Date.now() - 90 * 86_400_000);
  const [ps, vs, units, views, sales, ratings] = await Promise.all([
    d.select().from(products).where(eq(products.active, true)).orderBy(asc(products.sort)),
    d.select().from(variants),
    availableUnits(),
    d.select({ productId: productViews.productId, n: sql<number>`sum(${productViews.views})::int` }).from(productViews).where(gte(productViews.day, since30)).groupBy(productViews.productId),
    d.select({ productId: orderItems.productId, n: sql<number>`sum(${orderItems.qty})::int` }).from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(gte(orders.createdAt, since90), inArray(orders.paymentStatus, ['paid', 'cod_due', 'part_paid']))).groupBy(orderItems.productId),
    d.select({ productId: reviews.productId, avg: sql<number>`avg(${reviews.rating})::float`, n: sql<number>`count(*)::int` }).from(reviews)
      .where(eq(reviews.status, 'approved')).groupBy(reviews.productId),
  ]);
  const vmap = new Map(views.map((v) => [v.productId, v.n]));
  const smap = new Map(sales.map((v) => [v.productId, v.n]));
  const rmap = new Map(ratings.map((r) => [r.productId, { avg: Math.round(r.avg * 10) / 10, count: r.n }]));
  const rows = ps.map((p) => ({
    ...p,
    variants: vs.filter((v) => v.productId === p.id).sort((a, b) => GRADE_ORDER.indexOf(a.grade as GradeKey) - GRADE_ORDER.indexOf(b.grade as GradeKey)),
    units: units.filter((u) => u.productId === p.id),
    popularity: (vmap.get(p.id) ?? 0) + 25 * (smap.get(p.id) ?? 0),
    rating: rmap.get(p.id) ?? null,
  }));
  cache = { at: Date.now(), rows };
  return rows;
}

export function invalidateProducts() {
  cache = null;
}

export async function getProduct(slug: string): Promise<ProductFull | null> {
  const rows = await allProducts();
  return rows.find((p) => p.slug === slug) ?? null;
}

export function toCard(p: ProductFull): CardProduct {
  const live = p.variants.filter((v) => v.active);
  const grades = GRADE_ORDER.filter((g) => live.some((v) => v.grade === g) || p.units.some((u) => u.grade === g)).map((g) => {
    const us = p.units.filter((u) => u.grade === g);
    const listPrice = live.find((v) => v.grade === g)?.price ?? null;
    return { grade: g, price: us.length ? Math.min(...us.map((u) => u.price)) : listPrice, stock: us.length };
  });
  const onSale = grades.filter((g) => g.stock > 0 && g.price != null);
  const pool = onSale.length ? onSale : grades.filter((g) => g.price != null);
  const cheapest = pool.reduce<(typeof pool)[number] | null>((a, b) => (!a || (b.price ?? 0) < (a.price ?? 0) ? b : a), null);
  const listed = p.units.map((u) => u.listedAt).filter(Boolean).sort().at(-1) ?? null;
  return {
    id: p.id, slug: p.slug, title: p.title, brand: p.brand, family: p.family, model: p.model, year: p.year,
    cpu: p.cpu, cpuShort: p.cpuShort, cpuTier: p.cpuTier, cpuGen: p.cpuGen, ramGb: p.ramGb, ssdGb: p.ssdGb,
    maxRamGb: Math.max(p.ramGb, ...p.ramOptions.map((o) => o.gb)),
    screenIn: p.screenIn, screenRes: p.screenRes, weightKg: p.weightKg, uses: p.uses, categories: p.categories, tags: p.tags,
    art: p.art, image: p.images[0] ?? null, featured: p.featured, newPrice: p.newPrice,
    fromPrice: cheapest?.price ?? 0, fromGrade: cheapest?.grade ?? 'excellent', grades,
    ramOn: [...new Set(p.units.length ? p.units.map((u) => u.ramGb) : [p.ramGb])],
    ssdOn: [...new Set(p.units.length ? p.units.map((u) => u.ssdGb) : [p.ssdGb])],
    unitsOnSale: p.units.length,
    bestBattery: p.units.length ? Math.max(...p.units.map((u) => u.batteryHealth ?? 0)) : null,
    inStock: p.units.length > 0,
    sort: p.sort, createdAt: p.createdAt.toISOString(), newestListing: listed, popularity: p.popularity, rating: p.rating,
  };
}

export async function cardProducts(): Promise<CardProduct[]> {
  return (await allProducts()).map(toCard);
}

/** Similar laptops: same brand or close in price and use, excluding the product itself. */
export async function similarTo(p: ProductFull, n = 4): Promise<CardProduct[]> {
  const all = await cardProducts();
  const me = toCard(p);
  return all
    .filter((c) => c.id !== p.id && c.inStock)
    .map((c) => ({ c, score: Math.abs(c.fromPrice - me.fromPrice) / 100 - (c.uses.some((u) => p.uses.includes(u)) ? 3000 : 0) - (c.screenIn === p.screenIn ? 800 : 0) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => x.c);
}

/** More from the same brand family. */
export async function relatedTo(p: ProductFull, n = 4): Promise<CardProduct[]> {
  const all = await cardProducts();
  return all.filter((c) => c.id !== p.id && c.brand === p.brand).sort((a, b) => Number(b.inStock) - Number(a.inStock) || Math.abs((a.year ?? 0) - (p.year ?? 0)) - Math.abs((b.year ?? 0) - (p.year ?? 0))).slice(0, n);
}

/** India date (YYYY-MM-DD), for daily counters. */
export const indiaDay = (d = new Date()) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

export async function countView(productId: string) {
  const d = await db();
  await d.insert(productViews).values({ productId, day: indiaDay(), views: 1 })
    .onConflictDoUpdate({ target: [productViews.productId, productViews.day], set: { views: sql`${productViews.views} + 1` } });
}
