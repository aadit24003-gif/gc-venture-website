import Link from 'next/link';
import type { CardProduct } from '@/lib/products';
import { GRADES, GRADE_ORDER } from '@/lib/config';
import { gb, rupees } from '@/lib/format';
import { emiFrom, savedPct } from '@/lib/pricing';
import ProductImage from './ui/ProductImage';
import CompareToggle from './compare/CompareToggle';
import WishButton from './WishButton';
import { Stars } from './ui/bits';

/**
 * Catalogue card: the model's photo, the lowest price among units on sale,
 * how many inspected units there are and the best measured battery among them.
 */
export default function ProductCard({ p, priority, wished = false }: { p: CardProduct; priority?: boolean; wished?: boolean }) {
  const saved = savedPct(p.fromPrice, p.newPrice);
  const emi = emiFrom(p.fromPrice);
  const fresh = p.newestListing && Date.now() - new Date(p.newestListing).getTime() < 3 * 86_400_000;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-white transition duration-300 hover:-translate-y-0.5 hover:border-line-2 hover:shadow-[var(--shadow-lift)]">
      <div className="relative">
        <div className="well aspect-[4/3] px-6 pb-2 pt-9">
          <ProductImage image={p.image} art={p.art} brand={p.brand} slug={p.slug} title={p.title} priority={priority}
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 90vw" className="transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {saved ? <span className="pill pill-accent">{saved}% off</span> : null}
          {!p.inStock ? <span className="pill pill-done">Sold out</span> : p.unitsOnSale <= 2 ? <span className="pill pill-wait">Only {p.unitsOnSale} left</span> : fresh ? <span className="pill pill-info">New arrival</span> : null}
        </div>
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
          <WishButton productId={p.id} title={p.title} initial={wished} />
        </div>
        <div className="absolute bottom-2 right-3 z-10 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
          <CompareToggle slug={p.slug} title={p.title} />
        </div>
      </div>
      <div className="flex flex-1 flex-col border-t border-line px-4 pb-4 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-mute">{p.brand} · {p.year}</p>
          {p.rating ? <span className="inline-flex items-center gap-1 text-[12px] text-mute"><Stars value={p.rating.avg} size={12} label={false} /><span className="sr-only">{p.rating.avg} out of 5,</span> ({p.rating.count})</span> : null}
        </div>
        <h3 className="mt-1 text-[17px] font-bold leading-snug tracking-[-0.015em]">
          <Link href={`/laptops/${p.slug}`} className="after:absolute after:inset-0 after:content-['']">{p.title.replace(`${p.brand} `, '')}</Link>
        </h3>
        <p className="mt-1 text-[13.5px] text-mute">{p.cpuShort} · {gb(p.ramGb)} · {gb(p.ssdGb)} · {p.screenIn}″</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {GRADE_ORDER.map((g) => {
            const x = p.grades.find((v) => v.grade === g);
            const on = !!x && x.stock > 0;
            return <span key={g} className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${on ? 'bg-canvas text-ink' : 'text-faint line-through'}`} title={on ? `${x!.stock} ${GRADES[g].label}` : `No ${GRADES[g].label} units`}>{GRADES[g].label}</span>;
          })}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-[12px] text-mute">{p.inStock ? 'From' : 'Last price'}</p>
            <p className="flex items-baseline gap-2"><span className="price text-[22px] leading-none">{rupees(p.fromPrice)}</span>{p.newPrice ? <s className="num text-[12.5px] text-faint">{rupees(p.newPrice)}</s> : null}</p>
            {emi ? <p className="mt-1 text-[12px] text-mute">or {rupees(emi)}/mo EMI</p> : null}
          </div>
          {p.inStock && p.bestBattery ? (
            <div className="text-right text-[11.5px] text-mute">
              <p><b className="text-ink">{p.unitsOnSale}</b> {p.unitsOnSale === 1 ? 'unit' : 'units'}</p>
              <p>battery up to <b className="text-ink">{p.bestBattery}%</b></p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
