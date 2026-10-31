import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, variants } from '@/lib/db/schema';
import { GRADE_ORDER, type GradeKey } from '@/lib/config';
import ProductRow from './ProductRow';

export default async function AdminProducts() {
  const d = await db();
  const [ps, vs] = await Promise.all([
    d.select().from(products).orderBy(asc(products.sort)),
    d.select().from(variants),
  ]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[38px]">Prices and stock</h1>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">Add a laptop</Link>
      </div>
      <p className="mt-2 max-w-[72ch] text-mute">Prices are what customers pay for each grade, before upgrades, warranty extensions and discounts. Stock counts go down automatically when an order is placed and back up if it is cancelled.</p>
      <ul className="mt-6 space-y-3">
        {ps.map((p) => (
          <ProductRow
            key={p.id}
            p={{ id: p.id, title: p.title, slug: p.slug, cpuShort: p.cpuShort, active: p.active, featured: p.featured, newPrice: p.newPrice }}
            variants={vs.filter((v) => v.productId === p.id).sort((a, b) => GRADE_ORDER.indexOf(a.grade as GradeKey) - GRADE_ORDER.indexOf(b.grade as GradeKey)).map((v) => ({ id: v.id, grade: v.grade, price: v.price, stock: v.stock, active: v.active }))}
          />
        ))}
      </ul>
    </div>
  );
}
