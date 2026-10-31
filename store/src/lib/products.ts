import { asc, eq } from 'drizzle-orm';
import { db } from './db';
import { products, variants } from './db/schema';
import { GRADE_ORDER, type GradeKey } from './config';

export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type ProductFull = Product & { variants: Variant[] };

/** Small card-sized view of a product, safe to send to the browser. */
export type CardProduct = {
  id: string; slug: string; title: string; brand: string; family: string; model: string; year: number | null;
  cpuShort: string; cpuTier: string; cpuGen: number | null; ramGb: number; ssdGb: number; maxRamGb: number;
  screenIn: number; screenRes: string; weightKg: number | null; uses: string[];
  art: Product['art']; images: Product['images']; featured: boolean; newPrice: number | null;
  /** Lowest price among grades in stock (or among all grades if none are). */
  fromPrice: number; fromGrade: GradeKey;
  grades: { grade: GradeKey; price: number; stock: number }[];
  inStock: boolean; sort: number;
};

let cache: { at: number; rows: ProductFull[] } | null = null;
const TTL = 15_000;

/** All active products with their variants, cached briefly in memory. */
export async function allProducts(): Promise<ProductFull[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  const d = await db();
  const [ps, vs] = await Promise.all([
    d.select().from(products).where(eq(products.active, true)).orderBy(asc(products.sort)),
    d.select().from(variants),
  ]);
  const byProduct = new Map<string, Variant[]>();
  for (const v of vs) byProduct.set(v.productId, [...(byProduct.get(v.productId) ?? []), v]);
  const rows = ps.map((p) => ({
    ...p,
    variants: (byProduct.get(p.id) ?? []).sort((a, b) => GRADE_ORDER.indexOf(a.grade as GradeKey) - GRADE_ORDER.indexOf(b.grade as GradeKey)),
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
  const stocked = live.filter((v) => v.stock > 0);
  const pool = stocked.length ? stocked : live;
  const cheapest = pool.reduce((a, b) => (b.price < a.price ? b : a), pool[0]);
  return {
    id: p.id, slug: p.slug, title: p.title, brand: p.brand, family: p.family, model: p.model, year: p.year,
    cpuShort: p.cpuShort, cpuTier: p.cpuTier, cpuGen: p.cpuGen, ramGb: p.ramGb, ssdGb: p.ssdGb,
    maxRamGb: Math.max(p.ramGb, ...p.ramOptions.map((o) => o.gb)),
    screenIn: p.screenIn, screenRes: p.screenRes, weightKg: p.weightKg, uses: p.uses,
    art: p.art, images: p.images, featured: p.featured, newPrice: p.newPrice,
    fromPrice: cheapest?.price ?? 0, fromGrade: (cheapest?.grade ?? 'excellent') as GradeKey,
    grades: live.map((v) => ({ grade: v.grade as GradeKey, price: v.price, stock: v.stock })),
    inStock: stocked.length > 0, sort: p.sort,
  };
}

export async function cardProducts(): Promise<CardProduct[]> {
  return (await allProducts()).map(toCard);
}

/** Similar laptops: same brand or close in price, excluding the product itself. */
export async function similarTo(p: ProductFull, n = 4): Promise<CardProduct[]> {
  const all = await cardProducts();
  const me = toCard(p);
  return all
    .filter((c) => c.id !== p.id && c.inStock)
    .map((c) => ({ c, score: Math.abs(c.fromPrice - me.fromPrice) / 100 - (c.brand === p.brand ? 4000 : 0) - (c.uses.some((u) => p.uses.includes(u)) ? 1500 : 0) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => x.c);
}
