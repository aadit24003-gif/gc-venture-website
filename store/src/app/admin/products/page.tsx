import Link from 'next/link';
import { and, asc, eq, sql } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { inventoryUnits, products, variants } from '@/lib/db/schema';
import { GRADE_ORDER, type GradeKey } from '@/lib/config';
import { PageHead } from '../ui';
import ProductRow from './ProductRow';

export const metadata = { title: 'Laptop models' };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff('catalogue.manage');
  const q = ((await searchParams).q ?? '').toLowerCase();
  const d = await db();
  const [ps, vs, counts] = await Promise.all([
    d.select().from(products).orderBy(asc(products.sort)),
    d.select().from(variants),
    d.select({ productId: inventoryUnits.productId, grade: inventoryUnits.grade, n: sql<number>`count(*)::int` }).from(inventoryUnits).where(and(eq(inventoryUnits.status, 'available'))).groupBy(inventoryUnits.productId, inventoryUnits.grade),
  ]);
  const shown = ps.filter((p) => !q || p.title.toLowerCase().includes(q));
  return (
    <div>
      <PageHead title="Laptop models" intro="Each model’s grade prices, visibility and details. Units on sale come from Inventory." actions={<Link href="/admin/products/new" className="btn btn-primary btn-sm"><Plus size={15} /> Add a model</Link>} />
      <form action="/admin/products" className="mb-4"><label htmlFor="mq" className="sr-only">Search models</label><input id="mq" name="q" defaultValue={q} placeholder="Search models" className="field !min-h-9 max-w-[320px] text-[13.5px]" /></form>
      <ul className="space-y-3">
        {shown.map((p) => (
          <ProductRow
            key={p.id}
            p={{ id: p.id, title: p.title, slug: p.slug, cpuShort: p.cpuShort, active: p.active, featured: p.featured, newPrice: p.newPrice }}
            variants={GRADE_ORDER.map((g) => {
              const v = vs.find((x) => x.productId === p.id && x.grade === g);
              return { id: v?.id ?? -GRADE_ORDER.indexOf(g) - 1, grade: g, price: v?.price ?? 0, stock: counts.find((c) => c.productId === p.id && c.grade === g)?.n ?? 0, active: v?.active ?? false };
            }).sort((a, b) => GRADE_ORDER.indexOf(a.grade as GradeKey) - GRADE_ORDER.indexOf(b.grade as GradeKey))}
          />
        ))}
      </ul>
    </div>
  );
}
