import type { Metadata } from 'next';
import { cardProducts } from '@/lib/products';
import { parseFilters, USES } from '@/lib/filters';
import Catalogue from '@/components/catalogue/Catalogue';
import { CHECK_COUNT, POLICY } from '@/lib/config';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  const brand = f.brand.length === 1 ? (f.brand[0] === 'Apple' ? 'MacBooks' : `${f.brand[0]} laptops`) : 'laptops';
  const use = USES.find((u) => u.key === f.use);
  return {
    title: `Refurbished ${brand}${use ? ` for ${use.label.toLowerCase()}` : ''}`,
    description: `Certified refurbished ${brand} with a condition report, ${POLICY.warrantyMonths}-month warranty and free delivery across India.`,
    alternates: { canonical: '/laptops' },
  };
}

export default async function LaptopsPage({ searchParams }: Props) {
  const [items, sp] = await Promise.all([cardProducts(), searchParams]);
  const initial = parseFilters(sp);
  const title = initial.brand.length === 1 && initial.brand[0] === 'Apple' ? 'Refurbished MacBooks' : 'Refurbished laptops';
  return (
    <div className="wrap pb-10 pt-10 md:pt-14">
      <header className="max-w-[760px]">
        <h1 className="text-[40px] md:text-[56px]">{title}</h1>
        <p className="mt-3 text-[17px] text-mute">
          Each one passed {CHECK_COUNT} checks, carries its grade and battery health on the tag, and comes with a {POLICY.warrantyMonths}-month warranty.
        </p>
      </header>
      <Catalogue items={items} initial={initial} />
    </div>
  );
}
