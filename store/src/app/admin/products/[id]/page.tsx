import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, variants } from '@/lib/db/schema';
import { GRADE_ORDER } from '@/lib/config';
import ProductEditor from '../ProductEditor';

export default async function EditLaptop({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await db();
  const [p] = await d.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) notFound();
  const vs = await d.select().from(variants).where(eq(variants.productId, id));
  const maxRam = p.ramOptions.length > 1 ? Math.max(...p.ramOptions.map((o) => o.gb)) : 0;
  return (
    <div>
      <Link href="/admin/products" className="link text-[14px]">Prices and stock</Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[38px]">{p.title}</h1>
        <Link href={`/laptops/${p.slug}`} target="_blank" className="link text-[15px]">View in the store</Link>
      </div>
      <div className="mt-6">
        <ProductEditor
          photos={p.images}
          initial={{
            id: p.id, brand: p.brand, family: p.family, model: p.model, year: p.year, cpu: p.cpu, cpuShort: p.cpuShort, cpuTier: p.cpuTier, cpuGen: p.cpuGen,
            gpu: p.gpu, screenIn: p.screenIn, screenRes: p.screenRes, touch: p.touch, weightKg: p.weightKg, ramGb: p.ramGb, maxRamGb: maxRam, ssdGb: p.ssdGb,
            ports: p.ports.join(', '), description: p.description, highlights: [...p.highlights, '', '', ''].slice(0, 3),
            uses: p.uses.filter((u) => u !== 'everyday') as ('study' | 'code' | 'design' | 'office' | 'travel')[],
            style: p.art.style, colour: p.art.colour, notch: !!p.art.notch, newPrice: p.newPrice ? Math.round(p.newPrice / 100) : null,
            grades: GRADE_ORDER.map((g) => { const v = vs.find((x) => x.grade === g); return { grade: g, price: v ? Math.round(v.price / 100) : 0, stock: v?.stock ?? 0, active: v?.active ?? false }; }),
          }}
        />
      </div>
    </div>
  );
}
