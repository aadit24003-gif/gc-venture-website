import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { categories, inventoryUnits, products, variants } from '@/lib/db/schema';
import { GRADE_ORDER } from '@/lib/config';
import { PageHead } from '../../ui';
import ProductEditor from '../ProductEditor';

export default async function EditLaptop({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('catalogue.manage');
  const { id } = await params;
  const d = await db();
  const [p] = await d.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) notFound();
  const [vs, cats, counts] = await Promise.all([
    d.select().from(variants).where(eq(variants.productId, id)),
    d.select({ slug: categories.slug, name: categories.name }).from(categories).orderBy(categories.sort),
    d.select({ grade: inventoryUnits.grade, n: sql<number>`count(*)::int` }).from(inventoryUnits).where(and(eq(inventoryUnits.productId, id), eq(inventoryUnits.status, 'available'))).groupBy(inventoryUnits.grade),
  ]);
  const maxRam = p.ramOptions.length > 1 ? Math.max(...p.ramOptions.map((o) => o.gb)) : 0;
  return (
    <div>
      <PageHead back={{ href: '/admin/products', label: 'Laptop models' }} title={p.title} actions={<><Link href={`/admin/inventory/new?product=${p.id}`} className="btn btn-ghost btn-sm">Receive a unit</Link><Link href={`/laptops/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm">View in the store</Link></>} />
      <ProductEditor
        photos={p.images} categories={cats} units={Object.fromEntries(counts.map((c) => [c.grade, c.n]))}
        initial={{
          id: p.id, brand: p.brand, family: p.family, model: p.model, year: p.year, cpu: p.cpu, cpuShort: p.cpuShort, cpuTier: p.cpuTier, cpuGen: p.cpuGen,
          gpu: p.gpu, screenIn: p.screenIn, screenRes: p.screenRes, touch: p.touch, weightKg: p.weightKg, ramGb: p.ramGb, maxRamGb: maxRam, ssdGb: p.ssdGb,
          ports: p.ports.join(', '), description: p.description, highlights: [...p.highlights, '', '', ''].slice(0, 3),
          uses: p.uses.filter((u) => u !== 'everyday') as ('study' | 'code' | 'design' | 'office' | 'travel')[],
          style: p.art.style, colour: p.art.colour, notch: !!p.art.notch, newPrice: p.newPrice ? Math.round(p.newPrice / 100) : null,
          grades: GRADE_ORDER.map((g) => { const v = vs.find((x) => x.grade === g); return { grade: g, price: v ? Math.round(v.price / 100) : 0, active: v?.active ?? false }; }),
          categories: p.categories, tags: p.tags.join(', '), specs: Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join('\n'),
          seoTitle: p.seoTitle, seoDescription: p.seoDescription, featured: p.featured, active: p.active,
        }}
      />
    </div>
  );
}
