import { buildCatalogue } from '../catalogue';
import { products, variants } from './schema';
import type { DB } from './index';

/** Writes the starting catalogue. Only runs on an empty products table. */
export async function seedCatalogue(db: DB) {
  const rows = buildCatalogue();
  await db.transaction(async (tx) => {
    await tx.insert(products).values(rows.map((r) => r.product)).onConflictDoNothing();
    await tx.insert(variants).values(rows.flatMap((r) => r.variants)).onConflictDoNothing();
  });
}
