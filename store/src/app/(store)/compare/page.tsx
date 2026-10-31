import type { Metadata } from 'next';
import Link from 'next/link';
import { allProducts, toCard } from '@/lib/products';
import { GRADES, GRADE_ORDER, POLICY } from '@/lib/config';
import { gb, rupees } from '@/lib/format';
import { emiFrom } from '@/lib/pricing';
import LaptopArt from '@/components/LaptopArt';
import CompareClear from './CompareClear';

export const metadata: Metadata = { title: 'Compare laptops', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? '').split(',').filter(Boolean).slice(0, 3);
  const all = await allProducts();
  const ps = ids.map((id) => all.find((p) => p.slug === id)).filter((p): p is NonNullable<typeof p> => !!p);

  if (ps.length < 2) {
    return (
      <div className="wrap max-w-[720px] py-16">
        <h1 className="text-[40px]">Compare laptops</h1>
        <p className="mt-3 text-mute">Pick two or three laptops with the Compare button on any card, then come back here.</p>
        <Link href="/laptops" className="btn btn-primary mt-6">Browse laptops</Link>
      </div>
    );
  }

  const cards = ps.map(toCard);
  const maxRam = (p: (typeof ps)[number]) => Math.max(...p.ramOptions.map((o) => o.gb));
  const maxSsd = (p: (typeof ps)[number]) => Math.max(...p.ssdOptions.map((o) => o.gb));
  // mark the best value in rows where "best" is unambiguous
  const best = {
    price: Math.min(...cards.map((c) => c.fromPrice)),
    weight: Math.min(...ps.map((p) => p.weightKg ?? 99)),
    year: Math.max(...ps.map((p) => p.year ?? 0)),
    ram: Math.max(...ps.map(maxRam)),
  };
  const Best = ({ on, children }: { on: boolean; children: React.ReactNode }) => (
    <span className={on ? 'inline-flex items-center gap-2 font-semibold text-pass' : ''}>{children}{on && <span className="rounded-md bg-pass-soft px-1.5 py-0.5 text-[11.5px]">best</span>}</span>
  );

  const rows: [string, (p: (typeof ps)[number], i: number) => React.ReactNode][] = [
    ['Price from', (p, i) => <Best on={cards[i].fromPrice === best.price}><span className="price text-[22px]">{rupees(cards[i].fromPrice)}</span></Best>],
    ['EMI from', (_, i) => { const e = emiFrom(cards[i].fromPrice); return e ? `${rupees(e)}/month` : '—'; }],
    ['Grades in stock', (p) => GRADE_ORDER.filter((g) => p.variants.some((v) => v.grade === g && v.stock > 0 && v.active)).map((g) => GRADES[g].label).join(', ') || 'Sold out'],
    ['Processor', (p) => p.cpu],
    ['Graphics', (p) => p.gpu],
    ['Memory', (p) => <Best on={maxRam(p) === best.ram}>{gb(p.ramGb)}{maxRam(p) > p.ramGb ? `, up to ${gb(maxRam(p))}` : ', built in'}</Best>],
    ['Storage', (p) => `${gb(p.ssdGb)} SSD${maxSsd(p) > p.ssdGb ? `, up to ${gb(maxSsd(p))}` : ''}`],
    ['Display', (p) => `${p.screenIn}″ ${p.screenRes}`],
    ['Weight', (p) => (p.weightKg ? <Best on={p.weightKg === best.weight}>{p.weightKg} kg</Best> : '—')],
    ['Model year', (p) => (p.year ? <Best on={p.year === best.year}>{p.year}</Best> : '—')],
    ['Ports', (p) => p.ports.join(', ')],
    ['Operating system', (p) => p.os],
    ['Warranty', () => `${POLICY.warrantyMonths} months`],
  ];

  return (
    <div className="wrap pb-10 pt-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[40px] md:text-[52px]">Compare laptops</h1>
        <CompareClear />
      </div>
      <div className="mt-8 overflow-x-auto rounded-sheet bg-white">
        <table className="w-full min-w-[720px] table-fixed text-[15px]">
          <caption className="sr-only">Specifications side by side</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[180px] p-5 text-left align-bottom text-[14px] font-medium text-mute">Laptop</th>
              {ps.map((p) => (
                <th key={p.id} scope="col" className="p-5 text-left align-bottom font-normal">
                  <div className="rounded-2xl bg-bench p-3"><LaptopArt art={p.art} brand={p.brand} slug={p.slug} flat /></div>
                  <Link href={`/laptops/${p.slug}`} className="display mt-3 block text-[19px] font-semibold text-spruce hover:underline">{p.title}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cell]) => (
              <tr key={label} className="border-t border-line align-top">
                <th scope="row" className="p-5 text-left text-[14px] font-medium text-mute">{label}</th>
                {ps.map((p, i) => <td key={p.id} className="p-5">{cell(p, i)}</td>)}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td />
              {ps.map((p) => <td key={p.id} className="p-5"><Link href={`/laptops/${p.slug}`} className="btn btn-primary btn-sm">Choose grade and buy</Link></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
