'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { products, variants } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { invalidateProducts } from '@/lib/products';
import { audit } from '@/lib/audit';

const Input = z.object({
  id: z.string(), active: z.boolean(), featured: z.boolean(), newPrice: z.number().int().min(0).nullable(),
  grades: z.array(z.object({ grade: z.string(), price: z.number().int().min(0).max(10_00_000_00), active: z.boolean() })),
});

/** Quick edit from the models list: visibility, featured, new price and grade prices. */
export async function saveModelPrices(input: z.input<typeof Input>) {
  const v = await staffCan('catalogue.manage');
  if (!v) return { ok: false as const, error: 'Your role can’t do that.' };
  const p = Input.safeParse(input);
  if (!p.success) return { ok: false as const, error: p.error.issues[0].message };
  if (p.data.grades.some((g) => g.active && g.price < 1000_00)) return { ok: false as const, error: 'Give every offered grade a price of at least ₹1,000.' };
  const d = await db();
  await d.transaction(async (tx) => {
    await tx.update(products).set({ active: p.data.active, featured: p.data.featured, newPrice: p.data.newPrice, updatedAt: new Date() }).where(eq(products.id, p.data.id));
    for (const g of p.data.grades) {
      await tx.insert(variants).values({ productId: p.data.id, grade: g.grade, price: g.price, active: g.active })
        .onConflictDoUpdate({ target: [variants.productId, variants.grade], set: { price: g.price, active: g.active } });
    }
  });
  await audit(v, 'product.prices', 'product', p.data.id, p.data);
  invalidateProducts();
  revalidatePath('/admin/products');
  return { ok: true as const };
}
