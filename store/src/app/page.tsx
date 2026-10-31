import Link from 'next/link';
import { Banknote, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { cardProducts, getProduct } from '@/lib/products';
import { BRAND, CHECK_COUNT, LEGAL, POLICY, STUDENT, type GradeKey } from '@/lib/config';
import { BRANDS } from '@/lib/filters';
import { BRAND_MARKS } from '@/lib/brand-marks';
import { rupees } from '@/lib/format';
import { savedPct } from '@/lib/pricing';
import HeroScan from '@/components/home/HeroScan';
import Finder from '@/components/home/Finder';
import GradeExplainer from '@/components/home/GradeExplainer';
import ChecksBoard from '@/components/home/ChecksBoard';
import Faq from '@/components/Faq';

export const dynamic = 'force-dynamic';

const HERO_SLUG = 'lenovo-thinkpad-x1-carbon-gen-9';
const GRADE_SLUG = 'lenovo-thinkpad-t14-gen-2';

const FAQ: [string, string][] = [
  ['Is refurbished the same as second-hand?', `No. A second-hand laptop is sold as it is. Ours are tested on ${CHECK_COUNT} points, repaired with matching parts where needed, deep cleaned, wiped and reinstalled, then graded and covered by a ${POLICY.warrantyMonths}-month warranty.`],
  ['What does the warranty cover?', `Any hardware fault that isn’t caused by a drop, liquid or tampering, for ${POLICY.warrantyMonths} months from delivery. We repair it or replace it with the same or a better model, and collect it from you.`],
  ['What if I don’t like it?', `Return it within ${POLICY.returnDays} days of delivery for a full refund. We arrange the pickup.`],
  ['How do I pay?', `UPI, cards, net banking and wallets through Razorpay, card EMI from 3 to 12 months, or pay on delivery for orders up to ${rupees(POLICY.cod.maxOrder)}.`],
  ['How long does delivery take?', 'Two to four working days to most cities, up to a week elsewhere. Delivery is free and insured, and you get a tracking link by email.'],
  ['Do you sell to companies?', `Yes, with a GST invoice: add your GSTIN at checkout. For ten or more laptops for a project, you can also rent them from our sister company ${LEGAL.rentals.name}.`],
];

export default async function Home() {
  const [items, hero, gradeModel] = await Promise.all([cardProducts(), getProduct(HERO_SLUG), getProduct(GRADE_SLUG)]);
  const heroGrade: GradeKey = 'excellent';
  const heroPrice = hero?.variants.find((v) => v.grade === heroGrade)?.price ?? 0;
  const maxSaved = Math.max(0, ...items.map((p) => savedPct(p.fromPrice, p.newPrice) ?? 0));
  const brands = BRANDS.map((b) => {
    const mine = items.filter((p) => p.brand === b && p.inStock);
    return { brand: b, count: mine.length, from: mine.length ? Math.min(...mine.map((p) => p.fromPrice)) : 0 };
  });
  const savings = ['dell-latitude-5420', 'apple-macbook-air-m2', 'hp-elitebook-840-g10']
    .map((s) => items.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => !!p && !!p.newPrice);

  return (
    <>
      {/* Hero */}
      <section className="wrap grid items-center gap-x-12 gap-y-16 pb-24 pt-10 md:pt-16 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <h1 className="max-w-[14ch] text-[46px] leading-[1.0] tracking-[-0.03em] md:text-[76px]" style={{ fontVariationSettings: "'opsz' 96" }}>
            Every laptop arrives with its test results.
          </h1>
          <p className="mt-6 max-w-[50ch] text-[18px] leading-relaxed text-ink/80">
            Business-grade Dell, HP, Lenovo and Apple laptops, refurbished and checked on {CHECK_COUNT} points. Graded honestly, up to {maxSaved}% below the new price, and covered for {POLICY.warrantyMonths} months.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/laptops" className="btn btn-primary btn-lg">Shop laptops</Link>
            <Link href="/students" className="btn btn-ghost btn-lg">Students get {STUDENT.percent}% off</Link>
          </div>
          <ul className="mt-10 grid max-w-[520px] grid-cols-2 gap-x-6 gap-y-3 text-[15px]">
            <li className="flex items-center gap-2.5"><ShieldCheck size={19} className="text-pass" />{POLICY.warrantyMonths}-month warranty</li>
            <li className="flex items-center gap-2.5"><RotateCcw size={19} className="text-pass" />{POLICY.returnDays}-day returns</li>
            <li className="flex items-center gap-2.5"><Truck size={19} className="text-pass" />Free, insured delivery</li>
            <li className="flex items-center gap-2.5"><Banknote size={19} className="text-pass" />EMI or pay on delivery</li>
          </ul>
        </div>
        {hero && (
          <div className="pb-36 sm:pb-8 sm:pr-12 lg:pr-16">
            <HeroScan slug={hero.slug} title={hero.title} brand={hero.brand} art={hero.art} grade={heroGrade} price={heroPrice} />
          </div>
        )}
      </section>

      {/* Brands */}
      <section className="wrap" aria-labelledby="brands-h">
        <h2 id="brands-h" className="sr-only">Shop by brand</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {brands.map((b) => (
            <li key={b.brand}>
              <Link href={`/laptops?brand=${b.brand}`} className="group flex h-full flex-col-reverse items-start justify-between gap-3 rounded-[24px] bg-white px-5 py-5 transition-shadow hover:shadow-[0_20px_40px_-26px_rgba(15,61,51,.5)] sm:flex-row sm:items-center sm:gap-4 md:px-6">
                <span>
                  <span className="display block text-[22px] font-semibold text-spruce">{b.brand === 'Apple' ? 'MacBook' : b.brand}</span>
                  <span className="text-[14px] text-mute">{b.count} models{b.from ? `, from ${rupees(b.from)}` : ''}</span>
                </span>
                <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden className="h-7 w-7 shrink-0 text-spruce/80 sm:h-[34px] sm:w-[34px] transition-transform duration-300 group-hover:scale-110"><path d={BRAND_MARKS[b.brand.toLowerCase() as keyof typeof BRAND_MARKS]} fill="currentColor" /></svg>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Finder */}
      <section className="wrap mt-24" aria-labelledby="finder-h">
        <h2 id="finder-h" className="max-w-[18ch] text-[38px] md:text-[52px]">Tell us what it’s for. We’ll narrow it down.</h2>
        <div className="mt-8"><Finder items={items} /></div>
      </section>

      {/* Grades */}
      {gradeModel && (
        <section className="wrap mt-28" aria-labelledby="grades-h">
          <h2 id="grades-h" className="max-w-[20ch] text-[38px] md:text-[52px]">Graded on how it looks, never on how it works.</h2>
          <div className="mt-10">
            <GradeExplainer example={{
              title: gradeModel.title, slug: gradeModel.slug, brand: gradeModel.brand, colour: gradeModel.art.colour,
              prices: Object.fromEntries(gradeModel.variants.filter((v) => v.active && v.stock > 0).map((v) => [v.grade, v.price])),
            }} />
          </div>
        </section>
      )}

      {/* Checks */}
      <section className="mt-28 bg-spruce py-20 md:py-28" aria-labelledby="checks-h">
        <div className="wrap">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 id="checks-h" className="text-[40px] text-white md:text-[56px]">{CHECK_COUNT} checks before it ships.</h2>
            <p className="max-w-[52ch] text-[17px] leading-relaxed text-white/75">
              A laptop that fails any one of them is repaired with a matching part and tested again from the start, or it isn’t sold. The result goes on its tag.
            </p>
          </div>
          <div className="mt-12"><ChecksBoard /></div>
          <Link href="/how-we-test" className="btn btn-tag mt-10">How we test and grade</Link>
        </div>
      </section>

      {/* Savings */}
      {savings.length > 0 && (
        <section className="wrap mt-28" aria-labelledby="save-h">
          <h2 id="save-h" className="max-w-[20ch] text-[38px] md:text-[52px]">The same machines companies buy, for a fraction.</h2>
          <ul className="mt-10 space-y-4">
            {savings.map((p) => {
              const pct = Math.round((p.fromPrice / p.newPrice!) * 100);
              return (
                <li key={p.id} className="rounded-[24px] bg-white p-5 md:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/laptops/${p.slug}`} className="display text-[20px] font-semibold text-spruce hover:underline">{p.title}</Link>
                    <span className="text-[15px] text-mute">About {rupees(p.newPrice!)} new</span>
                  </div>
                  <div className="relative mt-4 h-11 overflow-hidden rounded-xl bg-bench">
                    <div className="absolute inset-y-0 left-0 flex items-center rounded-xl bg-tag px-4" style={{ width: `${Math.max(pct, 22)}%` }}>
                      <span className="price whitespace-nowrap text-[18px]">{rupees(p.fromPrice)}</span>
                    </div>
                    <span className="absolute inset-y-0 right-4 flex items-center text-[14px] font-semibold text-pass">You keep {rupees(p.newPrice! - p.fromPrice)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="hint mt-3">New prices are approximate launch prices in India. Refurbished prices are for the lowest grade in stock today.</p>
        </section>
      )}

      {/* Students */}
      <section className="wrap mt-28" aria-labelledby="stu-h">
        <div className="relative overflow-hidden rounded-[36px] bg-tag px-7 py-12 md:px-14 md:py-16">
          <div className="relative z-10 max-w-[620px]">
            <h2 id="stu-h" className="text-[38px] md:text-[54px]">Students pay {STUDENT.percent}% less.</h2>
            <p className="mt-4 text-[18px] text-spruce/85">Verify once with your college email or a photo of your ID. The discount applies to every order for a year.</p>
            <Link href="/students" className="btn btn-primary btn-lg mt-8">Get your student price</Link>
          </div>
          <svg aria-hidden className="pointer-events-none absolute -bottom-12 right-2 h-[230px] w-[460px] md:h-[330px] md:w-[640px]" viewBox="0 0 640 330">
            <text x="640" y="300" textAnchor="end" fontSize="330" fontWeight="700" fill="#0f3d33" fillOpacity=".08" style={{ fontFamily: 'var(--font-display)', fontVariationSettings: "'wdth' 82" }}>{STUDENT.percent}%</text>
          </svg>
        </div>
      </section>

      {/* Business */}
      <section className="wrap mt-6" aria-labelledby="biz-h">
        <div className="grid gap-6 rounded-[36px] bg-white px-7 py-10 md:grid-cols-[1.4fr_1fr] md:items-center md:px-14">
          <div>
            <h2 id="biz-h" className="text-[30px] md:text-[38px]">Buying for a team?</h2>
            <p className="mt-3 max-w-[56ch] text-[16.5px] text-mute">Get a GST invoice on every order. Need ten or more laptops for a project or a new office? Our sister company {LEGAL.rentals.name} rents them, configured and supported, anywhere in India.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a href={LEGAL.rentals.url} className="btn btn-ghost" target="_blank" rel="noopener">Rent with {LEGAL.rentals.name}</a>
            <Link href="/contact" className="btn btn-primary">Ask for a bulk price</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="wrap mt-28 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="faq-h">
        <div>
          <h2 id="faq-h" className="text-[38px] md:text-[48px]">Before you buy</h2>
          <p className="mt-3 text-mute">Still unsure? <Link href="/contact" className="link">Talk to us</Link>; a person answers, usually within the hour.</p>
        </div>
        <Faq items={FAQ} />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'OnlineStore', name: BRAND.name, url: BRAND.url, description: BRAND.description,
        parentOrganization: { '@type': 'Organization', name: LEGAL.entity },
      }) }} />
    </>
  );
}
