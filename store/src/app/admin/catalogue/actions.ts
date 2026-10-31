'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { brands, categories, products } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { slugify } from '@/lib/catalogue';
import { audit } from '@/lib/audit';
import { invalidateProducts } from '@/lib/products';

const deny = { ok: false, error: 'Your role can’t do that.' };
const fields = (fd: FormData) => ({
  name: String(fd.get('name') ?? '').trim().slice(0, 60),
  description: String(fd.get('description') ?? '').trim().slice(0, 400),
  sort: Number(fd.get('sort') ?? 100) || 100,
  active: fd.get('active') === 'on',
});

export async function saveBrand(slug: string | null, fd: FormData) {
  const v = await staffCan('catalogue.manage');
  if (!v) return deny;
  const f = fields(fd);
  if (f.name.length < 2) return { ok: false, error: 'Enter the brand name.' };
  const d = await db();
  if (slug) await d.update(brands).set(f).where(eq(brands.slug, slug));
  else {
    const s = slugify(f.name);
    const [taken] = await d.select({ s: brands.slug }).from(brands).where(eq(brands.slug, s)).limit(1);
    if (taken) return { ok: false, error: 'That brand exists.' };
    await d.insert(brands).values({ slug: s, ...f });
  }
  await audit(v, slug ? 'brand.update' : 'brand.create', 'brand', slug ?? slugify(f.name), f);
  revalidatePath('/admin/catalogue');
  return { ok: true, message: 'Saved.' };
}

export async function saveCategory(slug: string | null, fd: FormData) {
  const v = await staffCan('catalogue.manage');
  if (!v) return deny;
  const f = fields(fd);
  if (f.name.length < 2) return { ok: false, error: 'Enter the category name.' };
  const d = await db();
  if (slug) await d.update(categories).set(f).where(eq(categories.slug, slug));
  else {
    const s = slugify(f.name);
    const [taken] = await d.select({ s: categories.slug }).from(categories).where(eq(categories.slug, s)).limit(1);
    if (taken) return { ok: false, error: 'That category exists.' };
    await d.insert(categories).values({ slug: s, ...f });
  }
  await audit(v, slug ? 'category.update' : 'category.create', 'category', slug ?? slugify(f.name), f);
  revalidatePath('/admin/catalogue');
  return { ok: true, message: 'Saved.' };
}

export async function deleteCategory(slug: string) {
  const v = await staffCan('catalogue.manage');
  if (!v) return deny;
  const d = await db();
  await d.update(products).set({ categories: sql`${products.categories} - ${slug}` });
  await d.delete(categories).where(eq(categories.slug, slug));
  await audit(v, 'category.delete', 'category', slug);
  invalidateProducts();
  revalidatePath('/admin/catalogue');
  return { ok: true, message: 'Category removed from every model and deleted.' };
}
