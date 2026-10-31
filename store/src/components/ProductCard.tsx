import Link from 'next/link';
import type { CardProduct } from '@/lib/products';
import { GRADES, GRADE_ORDER } from '@/lib/config';
import { gb, rupees } from '@/lib/format';
import { emiFrom, savedPct } from '@/lib/pricing';
import LaptopArt from './LaptopArt';
import CompareToggle from './compare/CompareToggle';

/**
 * Catalogue card. The yellow price tag hangs off the laptop like a shelf tag:
 * the lowest in-stock price, and how far below the new price it is.
 */
export default function ProductCard({ p, priority }: { p: CardProduct; priority?: boolean }) {
  const saved = savedPct(p.fromPrice, p.newPrice);
  const emi = emiFrom(p.fromPrice);
  const stocked = GRADE_ORDER.filter((g) => p.grades.find((x) => x.grade === g && x.stock > 0));
  const units = p.grades.reduce((n, g) => n + g.stock, 0);
  return (
    <article className="group relative flex h-full flex-col rounded-[24px] bg-white p-3 transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgba(15,61,51,.45)]">
      <div className="relative overflow-hidden rounded-[18px] bg-bench px-5 pb-3 pt-10">
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0].src} alt={p.images[0].alt} loading={priority ? 'eager' : 'lazy'} className="relative z-0 aspect-[480/330] w-full rounded-xl object-contain mix-blend-multiply transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:-translate-y-1" />
        ) : (
          <LaptopArt art={p.art} brand={p.brand} slug={p.slug} className="relative z-0 w-full transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:-translate-y-1" />
        )}
        <div className="qc-shadow absolute right-3 top-0 z-10 origin-top rotate-[3deg] transition-[rotate] duration-500 ease-[var(--ease-spring)] group-hover:rotate-[-3deg]">
          <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-spruce/40" aria-hidden />
          <div className="qc-tag mt-3 !w-auto min-w-[112px] !px-3 !pb-2.5 !pt-6 text-center" style={{ ['--hole' as string]: 'var(--color-bench)' }}>
            {p.inStock ? (
              <>
                <p className="text-[11.5px] font-semibold leading-none">from</p>
                <p className="price mt-0.5 text-[22px] leading-none">{rupees(p.fromPrice)}</p>
                {saved && <p className="mt-1 text-[11.5px] font-semibold leading-none">{saved}% below new</p>}
              </>
            ) : (
              <p className="py-1 text-[13px] font-semibold leading-tight">Sold out</p>
            )}
          </div>
        </div>
        <CompareToggle slug={p.slug} title={p.title} className="absolute bottom-3 left-3 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-pressed:opacity-100" />
        {p.featured && p.inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-semibold text-spruce backdrop-blur">Popular</span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <p className="text-[13px] text-mute">{p.brand}{p.year ? `, ${p.year}` : ''}</p>
        <h3 className="mt-0.5 text-[20px] leading-tight">
          <Link href={`/laptops/${p.slug}`} className="after:absolute after:inset-0 after:rounded-[24px] focus-visible:outline-none">
            {p.model}
          </Link>
        </h3>
        <ul className="mt-3 flex flex-wrap gap-1.5 text-[13px] text-ink" aria-label="Specifications">
          {[p.cpuShort, `${gb(p.ramGb)} RAM`, `${gb(p.ssdGb)} SSD`, `${p.screenIn}″`].map((s) => (
            <li key={s} className="rounded-lg bg-bench px-2 py-1">{s}</li>
          ))}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="text-[13px] leading-snug text-mute">
            {p.inStock ? (
              <>
                <span className="font-medium text-pass">{units <= 3 ? `Only ${units} left` : 'In stock'}</span>
                <span className="block">{stocked.map((g) => GRADES[g].label).join(', ')}</span>
              </>
            ) : 'Back soon'}
          </p>
          {emi && p.inStock && <p className="text-right text-[13px] leading-snug text-mute">EMI from<span className="block font-semibold text-ink">{rupees(emi)}/mo</span></p>}
        </div>
      </div>
    </article>
  );
}
