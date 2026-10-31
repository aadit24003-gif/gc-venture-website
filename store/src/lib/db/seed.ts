import { eq, sql } from 'drizzle-orm';
import { buildCatalogue, BRAND_INFO, CATEGORY_INFO, classify } from '../catalogue';
import { DEFAULT_PAGES } from '../cms-defaults';
import { ensureDemoInventory, syncManufacturerPhotos } from '../inventory';
import { brands, categories, pages, products, variants } from './schema';
import type { DB } from './index';

/** Writes the starting catalogue (models and grade prices). Only runs on an empty products table. */
export async function seedCatalogue(db: DB) {
  const rows = buildCatalogue();
  await db.transaction(async (tx) => {
    await tx.insert(products).values(rows.map((r) => r.product)).onConflictDoNothing();
    await tx.insert(variants).values(rows.flatMap((r) => r.variants)).onConflictDoNothing();
  });
}

/**
 * Runs on every start; each step only fills in what is missing, so staff edits are kept.
 * - brands, categories and the editable legal pages
 * - categories and tags on models that have none
 * - official manufacturer photos on models without photos
 * - sample inventory units, in demo mode only
 */
export async function ensureSetup(db: DB) {
  await db.insert(brands).values(BRAND_INFO.map((b, i) => ({ ...b, sort: i }))).onConflictDoNothing();
  await db.insert(categories).values(CATEGORY_INFO.map((c, i) => ({ ...c, sort: i }))).onConflictDoNothing();
  await db.insert(pages).values(DEFAULT_PAGES).onConflictDoNothing();

  const bare = await db.select().from(products).where(sql`jsonb_array_length(${products.categories}) = 0`);
  for (const p of bare) {
    const maxRamGb = Math.max(p.ramGb, ...p.ramOptions.map((o) => o.gb));
    const { categories: cats, tags } = classify({ ...p, maxRamGb, ports: p.ports, highlights: p.highlights });
    await db.update(products).set({ categories: cats, tags: p.tags.length ? p.tags : tags }).where(eq(products.id, p.id));
  }

  await syncManufacturerPhotos(db);
  await ensureDemoInventory(db);
}
