'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { z } from 'zod';
import { db } from '@/lib/db';
import { products, variants, type ProductImage } from '@/lib/db/schema';
import { requireStaff } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
import { invalidateProducts } from '@/lib/products';
import { slugify, upgradeOptions } from '@/lib/catalogue';
import { deletePublic, putPublic } from '@/lib/providers/storage';
import { GRADE_ORDER } from '@/lib/config';

const Details = z.object({
  id: z.string().nullable(), // null = new laptop
  brand: z.string().trim().min(2).max(30),
  family: z.string().trim().min(2).max(40),
  model: z.string().trim().min(2, 'Enter the model, e.g. Latitude 5420.').max(60),
  year: z.number().int().min(2010).max(2030).nullable(),
  cpu: z.string().trim().min(3, 'Enter the processor, e.g. Intel Core i5-1145G7.').max(80),
  cpuShort: z.string().trim().min(2, 'Enter a short processor label, e.g. Core i5 11th Gen.').max(40),
  cpuTier: z.string().trim().min(2).max(12),
  cpuGen: z.number().int().min(1).max(20).nullable(),
  gpu: z.string().trim().min(2).max(60),
  screenIn: z.number().min(10).max(18),
  screenRes: z.string().trim().min(3).max(60),
  touch: z.boolean(),
  weightKg: z.number().min(0.5).max(5).nullable(),
  ramGb: z.number().int().min(2).max(128),
  maxRamGb: z.number().int().min(0).max(128),
  ssdGb: z.number().int().min(64).max(8192),
  ports: z.string().max(300),
  description: z.string().trim().min(20, 'Write a sentence or two about who it suits.').max(600),
  highlights: z.array(z.string().trim().max(60)).max(5),
  uses: z.array(z.enum(['study', 'code', 'design', 'office', 'travel', 'everyday'])),
  style: z.enum(['thinkpad', 'latitude', 'elitebook', 'probook', 'macbook-air', 'macbook-pro']),
  colour: z.enum(['black', 'silver', 'graphite', 'space-grey', 'midnight', 'starlight']),
  notch: z.boolean(),
  newPrice: z.number().int().min(0).nullable(), // rupees
  grades: z.array(z.object({ grade: z.enum(GRADE_ORDER as [string, ...string[]]), price: z.number().int().min(0), stock: z.number().int().min(0).optional(), active: z.boolean() })),
  categories: z.array(z.string().max(40)).max(12).default([]),
  tags: z.string().max(300).default(''),
  specs: z.string().max(2000).default(''),
  seoTitle: z.string().trim().max(70).nullable().default(null),
  seoDescription: z.string().trim().max(170).nullable().default(null),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});
export type DetailsInput = z.input<typeof Details>;

export async function saveLaptop(input: DetailsInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireStaff('catalogue.manage');
  const p = Details.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const v = p.data;
  if (v.grades.some((g) => g.active && g.price < 1000)) return { ok: false, error: 'Give every offered grade a price of at least ₹1,000.' };
  const d = await db();
  const title = `${v.brand} ${v.model}`;
  const id = v.id ?? slugify(title);
  if (!v.id) {
    const [taken] = await d.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (taken) return { ok: false, error: `${title} is already in the catalogue. Edit it instead.` };
  }
  const values = {
    brand: v.brand, family: v.family, model: v.model, title, year: v.year,
    cpu: v.cpu, cpuShort: v.cpuShort, cpuTier: v.cpuTier, cpuGen: v.cpuGen, gpu: v.gpu,
    screenIn: v.screenIn, screenRes: v.screenRes, touch: v.touch, weightKg: v.weightKg,
    os: v.brand === 'Apple' ? 'macOS' : 'Windows 11 Pro',
    ports: v.ports.split(',').map((x) => x.trim()).filter(Boolean),
    ramGb: v.ramGb, ssdGb: v.ssdGb, ...upgradeOptions(v.brand, v.ramGb, v.maxRamGb, v.ssdGb),
    newPrice: v.newPrice ? v.newPrice * 100 : null,
    uses: [...new Set(['everyday', ...v.uses])], highlights: v.highlights.filter(Boolean),
    description: v.description, art: { style: v.style, colour: v.colour, ...(v.notch ? { notch: true } : {}) },
    categories: v.categories, tags: v.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20),
    specs: Object.fromEntries(v.specs.split('\n').map((l) => l.split(':')).filter((x) => x.length >= 2 && x[0].trim()).map(([k, ...rest]) => [k.trim().slice(0, 40), rest.join(':').trim().slice(0, 120)])),
    seoTitle: v.seoTitle || null, seoDescription: v.seoDescription || null, featured: v.featured, active: v.active,
    updatedAt: new Date(),
  };
  await d.transaction(async (tx) => {
    if (v.id) await tx.update(products).set(values).where(eq(products.id, id));
    else await tx.insert(products).values({ id, slug: id, ...values, images: [], sort: 500 });
    for (const g of v.grades) {
      await tx.insert(variants).values({ productId: id, grade: g.grade, price: g.price * 100, active: g.active })
        .onConflictDoUpdate({ target: [variants.productId, variants.grade], set: { price: g.price * 100, active: g.active } });
    }
  });
  const actor = await requireStaff('catalogue.manage');
  await audit(actor, v.id ? 'product.update' : 'product.create', 'product', id, { title });
  invalidateProducts();
  revalidatePath('/admin/products');
  return { ok: true, id };
}

/** Adds photos to a laptop. Each is resized to at most 1600 px and saved as WebP without metadata. */
export async function uploadPhotos(form: FormData): Promise<{ ok: true; images: ProductImage[] } | { ok: false; error: string }> {
  await requireStaff('catalogue.manage');
  const id = String(form.get('id') ?? '');
  const d = await db();
  const [p] = await d.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return { ok: false, error: 'Laptop not found.' };
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: 'Choose at least one photo.' };
  if (p.images.length + files.length > 8) return { ok: false, error: 'Up to 8 photos per laptop.' };
  const added: ProductImage[] = [];
  for (const f of files) {
    if (f.size > 12 * 1024 * 1024) return { ok: false, error: `${f.name} is over 12 MB.` };
    try {
      const out = await sharp(Buffer.from(await f.arrayBuffer())).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
      const src = await putPublic(`${id}/${crypto.randomBytes(5).toString('hex')}.webp`, out.data, 'image/webp');
      added.push({ src, alt: `${p.title}, refurbished`, width: out.info.width, height: out.info.height });
    } catch (e) {
      console.error('photo upload', e);
      return { ok: false, error: `${f.name} couldn’t be read. Use JPG, PNG or WebP.` };
    }
  }
  const images = [...p.images, ...added];
  await d.update(products).set({ images, updatedAt: new Date() }).where(eq(products.id, id));
  invalidateProducts();
  return { ok: true, images };
}

export async function arrangePhotos(id: string, images: ProductImage[]): Promise<{ ok: boolean }> {
  await requireStaff('catalogue.manage');
  const d = await db();
  const [p] = await d.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return { ok: false };
  const keep = images.filter((i) => p.images.some((x) => x.src === i.src));
  for (const gone of p.images.filter((x) => !keep.some((k) => k.src === x.src))) await deletePublic(gone.src).catch(() => {});
  await d.update(products).set({ images: keep, updatedAt: new Date() }).where(eq(products.id, id));
  invalidateProducts();
  return { ok: true };
}
