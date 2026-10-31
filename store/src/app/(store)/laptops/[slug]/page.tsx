import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { allProducts, getProduct, relatedTo, similarTo, toCard } from '@/lib/products';
import { getViewer } from '@/lib/auth/session';
import { studentStatus } from '@/lib/students';
import { approvedReviews, ratingSummary } from '@/lib/reviews';
import { recentIds, wishlistIds } from '@/lib/shopping';
import { BRAND, CHECK_COUNT, GRADES, POLICY } from '@/lib/config';
import { formatDate, gb, rupees } from '@/lib/format';
import { USES } from '@/lib/filters';
import Gallery from '@/components/product/Gallery';
import BuyBox from '@/components/product/BuyBox';
import ViewTracker from '@/components/product/ViewTracker';
import ProductCard from '@/components/ProductCard';
import WishButton from '@/components/WishButton';
import CompareToggle from '@/components/compare/CompareToggle';
import { SectionHead, Stars } from '@/components/ui/bits';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: 'Laptop not found' };
  const c = toCard(p);
  return {
    title: p.seoTitle || `Refurbished ${p.title} (${p.cpuShort}, ${gb(p.ramGb)}, ${gb(p.ssdGb)})`,
    description: p.seoDescription || `${p.title}, certified refurbished, from ${rupees(c.fromPrice)}. ${c.unitsOnSale} inspected ${c.unitsOnSale === 1 ? 'unit' : 'units'} with measured battery health. ${POLICY.warrantyMonths}-month warranty.`,
    alternates: { canonical: `/laptops/${p.slug}` },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, sp, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const p = await getProduct(slug);
  if (!p) notFound();
  const [similar, related, student, reviews, rating, all] = await Promise.all([
    similarTo(p), relatedTo(p),
    viewer ? studentStatus(viewer.user.id) : Promise.resolve({ state: 'none' as const }),
    approvedReviews(p.id, 12), ratingSummary(p.id), allProducts(),
  ]);
  const wished = new Set(viewer ? await wishlistIds(viewer.user.id) : []);
  const recentList = viewer ? await recentIds(viewer.user.id, 9) : ((await cookies()).get('rv')?.value ?? '').split('.');
  const recent = recentList.filter((id) => id && id !== p.id).map((id) => all.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x).slice(0, 4).map(toCard);
  const card = toCard(p);

  const specs: [string, string][] = [
    ['Processor', p.cpu],
    ['Graphics', p.gpu],
    ['Memory', p.ramOptions.length > 1 ? `${gb(p.ramGb)} standard, upgradable to ${gb(Math.max(...p.ramOptions.map((o) => o.gb)))}` : `${gb(p.ramGb)}, built in`],
    ['Storage', `${gb(p.ssdGb)} NVMe SSD${p.ssdOptions.length > 1 ? `, up to ${gb(Math.max(...p.ssdOptions.map((o) => o.gb)))}` : ''}`],
    ['Display', `${p.screenIn}″ ${p.screenRes}${p.touch ? ', touch' : ''}`],
    ['Weight', p.weightKg ? `${p.weightKg} kg` : '—'],
    ['Ports', p.ports.join(', ')],
    ['Operating system', p.os === 'macOS' ? 'macOS, latest version the model supports' : 'Windows 11 Pro, activated'],
    ['Model year', p.year ? String(p.year) : '—'],
    ...Object.entries(p.specs),
    ['In the box', p.brand === 'Apple' ? 'Laptop and a compatible USB-C charger' : 'Laptop and a matching charger'],
  ];
  const prices = p.units.map((u) => u.price);
  const productLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: `${p.title} (Refurbished)`, sku: p.slug, mpn: p.model, brand: { '@type': 'Brand', name: p.brand },
    description: p.description, image: p.images.map((i) => `${BRAND.url}${i.src}`), category: 'Laptops',
    offers: prices.length
      ? { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: Math.min(...prices) / 100, highPrice: Math.max(...prices) / 100, offerCount: prices.length, availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/RefurbishedCondition', url: `${BRAND.url}/laptops/${p.slug}` }
      : { '@type': 'Offer', priceCurrency: 'INR', price: card.fromPrice / 100, availability: 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/RefurbishedCondition', url: `${BRAND.url}/laptops/${p.slug}` },
    // Only when genuine approved reviews exist.
    ...(rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating.avg, reviewCount: rating.count, bestRating: 5, worstRating: 1 } } : {}),
    ...(reviews.length ? { review: reviews.slice(0, 5).map((r) => ({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 }, author: { '@type': 'Person', name: r.authorName }, reviewBody: r.body, datePublished: r.createdAt.toISOString().slice(0, 10) })) } : {}),
  };
  const crumbsLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BRAND.url },
    { '@type': 'ListItem', position: 2, name: p.brand, item: `${BRAND.url}/brands/${p.brand.toLowerCase()}` },
    { '@type': 'ListItem', position: 3, name: p.title, item: `${BRAND.url}/laptops/${p.slug}` },
  ] };

  return (
    <div className="pb-24 md:pb-10">
      <ViewTracker productId={p.id} />
      <div className="wrap pt-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-mute">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li className="flex items-center gap-1"><ChevronRight size={13} aria-hidden="true" /><Link href="/laptops" className="hover:text-ink">Laptops</Link></li>
            <li className="flex items-center gap-1"><ChevronRight size={13} aria-hidden="true" /><Link href={`/brands/${p.brand.toLowerCase()}`} className="hover:text-ink">{p.brand}</Link></li>
            <li className="flex items-center gap-1" aria-current="page"><ChevronRight size={13} aria-hidden="true" /><span className="text-ink">{p.model}</span></li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-[132px] lg:self-start">
            <Gallery images={p.images} art={p.art} brand={p.brand} slug={p.slug} title={p.title} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <WishButton productId={p.id} title={p.title} initial={wished.has(p.id)} variant="button" />
              <CompareToggle slug={p.slug} title={p.title} className="!h-[46px] !rounded-xl !px-4 !text-[14px] border border-line-2" />
            </div>
          </div>

          <div>
            <p className="eyebrow">{p.brand} · {p.family} · {p.year}</p>
            <h1 className="mt-2 text-[34px] md:text-[44px]">{p.title}</h1>
            <p className="mt-2 text-[15.5px] text-mute">{p.cpuShort} · {gb(p.ramGb)} RAM · {gb(p.ssdGb)} SSD · {p.screenIn}″ {p.screenRes.split(' ')[0]}{p.weightKg ? ` · ${p.weightKg} kg` : ''}</p>
            {rating && <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-[14px]"><Stars value={rating.avg} /> <span className="text-mute">{rating.avg} · {rating.count} {rating.count === 1 ? 'review' : 'reviews'}</span></a>}
            <div className="mt-6">
              <BuyBox
                p={{ id: p.id, slug: p.slug, title: p.title, brand: p.brand, newPrice: p.newPrice, ramOptions: p.ramOptions, ssdOptions: p.ssdOptions, gradePrices: p.variants.filter((v) => v.active).map((v) => ({ grade: v.grade as keyof typeof GRADES, price: v.price })) }}
                units={p.units} student={student.state === 'approved' ? 'approved' : student.state === 'pending' ? 'pending' : 'none'} initialUnit={sp.unit ?? null}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="wrap mt-20 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="about-h">
          <h2 id="about-h" className="text-[28px]">About this model</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">{p.description}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {p.highlights.map((h) => <li key={h} className="rounded-2xl border border-line bg-white p-4 text-[14.5px] font-medium">{h}</li>)}
          </ul>
          <p className="mt-6 text-[14.5px] text-mute">Good for: {p.uses.map((u) => USES.find((x) => x.key === u)?.label).filter(Boolean).join(', ')}.</p>
          <h2 className="mt-14 text-[28px]" id="specs-h">Specifications</h2>
          <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-white">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[150px_1fr] gap-4 px-5 py-3.5 text-[14.5px] sm:grid-cols-[200px_1fr]"><dt className="text-mute">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-[13px] text-mute">Specifications are the model’s standard configuration. Each unit’s memory and storage are shown on its listing and report.</p>
        </section>
        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-canvas p-6">
            <p className="eyebrow">Every unit</p>
            <p className="mt-2 text-[22px] font-semibold">{CHECK_COUNT} checks before listing, one more before shipping</p>
            <p className="mt-2 text-[14.5px] text-mute">Battery and SSD health are measured, not estimated. Parts swapped during refurbishment are logged on the unit’s report.</p>
            <Link href="/how-we-test" className="btn btn-ghost btn-sm mt-4">How we test</Link>
          </div>
          <div className="rounded-card border border-line bg-white p-6">
            <p className="font-semibold">Grades for this model</p>
            <ul className="mt-3 space-y-3 text-[14px]">
              {(['pristine', 'excellent', 'good'] as const).map((g) => <li key={g}><b>{GRADES[g].label}:</b> <span className="text-mute">{GRADES[g].body}</span></li>)}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-white p-6 text-[14px]">
            <p className="font-semibold">Warranty and returns</p>
            <p className="mt-2 text-mute">{POLICY.warrantyMonths}-month warranty from delivery, extendable to {POLICY.warrantyExtensions.at(-1)?.months} months. Return within {POLICY.returnDays} days for a refund.</p>
            <p className="mt-3 flex gap-4"><Link href="/warranty" className="link">Warranty</Link><Link href="/returns" className="link">Returns</Link></p>
          </div>
        </aside>
      </div>

      {/* Reviews */}
      <section id="reviews" className="wrap mt-20 scroll-mt-32" aria-labelledby="reviews-h">
        <SectionHead id="reviews-h" title="Reviews" intro="Only customers who received this model can review it. We publish every review that follows our guidelines, good or bad." />
        {rating ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="rounded-card border border-line bg-white p-6">
              <p className="price text-[48px] leading-none">{rating.avg}</p>
              <Stars value={rating.avg} size={18} />
              <p className="mt-1 text-[13.5px] text-mute">{rating.count} verified {rating.count === 1 ? 'review' : 'reviews'}</p>
              <ul className="mt-4 space-y-1.5">
                {rating.byStar.map((s) => (
                  <li key={s.star} className="flex items-center gap-2 text-[12.5px]"><span className="mono w-3">{s.star}</span><span className="meter flex-1"><span style={{ width: `${(s.n / rating.count) * 100}%` }} /></span><span className="mono w-6 text-right text-mute">{s.n}</span></li>
                ))}
              </ul>
            </div>
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-card border border-line bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2"><Stars value={r.rating} /><span className="text-[13px] text-mute">{formatDate(r.createdAt)}</span></div>
                  {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                  <p className="mt-1.5 text-[15px] text-ink-2">{r.body}</p>
                  <p className="mt-3 text-[13px] text-mute">{r.authorName}{r.city ? `, ${r.city}` : ''}{r.verified ? ' · Verified purchase' : ''}</p>
                  {r.reply && <p className="mt-3 rounded-xl bg-canvas p-3 text-[14px]"><b>{BRAND.name}:</b> {r.reply}</p>}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-6 rounded-card border border-dashed border-line-2 p-6 text-mute">No reviews yet. Customers can review this model from their account after it’s delivered.</p>
        )}
      </section>

      {similar.length > 0 && (
        <section className="wrap mt-20" aria-labelledby="similar-h">
          <SectionHead id="similar-h" title="Similar laptops" intro="Close in price and in what they’re good at." />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{similar.map((c) => <li key={c.id}><ProductCard p={c} wished={wished.has(c.id)} /></li>)}</ul>
        </section>
      )}
      {related.length > 0 && (
        <section className="wrap mt-20" aria-labelledby="related-h">
          <SectionHead id="related-h" title={`More from ${p.brand}`} action={<Link href={`/brands/${p.brand.toLowerCase()}`} className="btn btn-ghost">All {p.brand}</Link>} />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((c) => <li key={c.id}><ProductCard p={c} wished={wished.has(c.id)} /></li>)}</ul>
        </section>
      )}
      {recent.length > 0 && (
        <section className="wrap mt-20" aria-labelledby="recent-h">
          <SectionHead id="recent-h" title="Recently viewed" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recent.map((c) => <li key={c.id}><ProductCard p={c} wished={wished.has(c.id)} /></li>)}</ul>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([productLd, crumbsLd]).replace(/</g, '\\u003c') }} />
    </div>
  );
}
