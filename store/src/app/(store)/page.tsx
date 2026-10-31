import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Lock, Receipt, ShieldCheck, Truck } from 'lucide-react';
import { BRAND, CHECK_COUNT, CHECKS, GRADES, GRADE_ORDER, LEGAL, POLICY, STUDENT } from '@/lib/config';
import { allProducts, toCard, type CardProduct } from '@/lib/products';
import { latestInspection } from '@/lib/inventory';
import { featuredReviews } from '@/lib/reviews';
import { getViewer } from '@/lib/auth/session';
import { wishlistIds } from '@/lib/shopping';
import { BUDGETS, GENS, priceFor } from '@/lib/filters';
import { rupees } from '@/lib/format';
import { savedPct } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';
import ProductCard from '@/components/ProductCard';
import Faq from '@/components/Faq';
import NewsletterForm from '@/components/NewsletterForm';
import UnitCertificate, { type CertUnit } from '@/components/home/UnitCertificate';
import { SectionHead, Stars } from '@/components/ui/bits';

export const dynamic = 'force-dynamic';

function Rail({ items, wished, label }: { items: CardProduct[]; wished: Set<string>; label: string }) {
  return (
    <ul aria-label={label} data-reveal className="rail mt-12 auto-cols-[78%] sm:auto-cols-[45%] md:auto-cols-[31%] xl:auto-cols-[calc((100%-60px)/4)]">
      {items.map((p, i) => <li key={p.id} data-reveal-item><ProductCard p={p} wished={wished.has(p.id)} priority={i < 2} /></li>)}
    </ul>
  );
}

export default async function Home() {
  const [rows, viewer, reviews, settings] = await Promise.all([allProducts(), getViewer(), featuredReviews(6), getSettings()]);
  const cards = rows.map(toCard);
  const inStock = cards.filter((c) => c.inStock);
  const wished = new Set(viewer ? await wishlistIds(viewer.user.id) : []);
  const unitsOnSale = inStock.reduce((n, c) => n + c.unitsOnSale, 0);

  // Hero: a featured model with units on sale, and its best unit's real inspection report.
  const heroProduct = rows.filter((p) => p.units.length && p.images.length).sort((a, b) => Number(b.featured) - Number(a.featured) || b.units.length - a.units.length)[0];
  let cert: CertUnit | null = null;
  if (heroProduct) {
    const u = [...heroProduct.units].sort((a, b) => (b.batteryHealth ?? 0) - (a.batteryHealth ?? 0))[0];
    const insp = await latestInspection(u.id);
    cert = {
      code: u.code, title: heroProduct.title, slug: heroProduct.slug, grade: u.grade, ramGb: u.ramGb, ssdGb: u.ssdGb,
      batteryHealth: u.batteryHealth, batteryCycles: u.batteryCycles, ssdHealth: u.ssdHealth, inspectedAt: u.inspectedAt,
      checks: insp?.checks.length || CHECK_COUNT, passed: insp ? insp.checks.filter((c) => c.result !== 'fail').length : CHECK_COUNT, cosmeticNotes: u.cosmeticNotes,
    };
  }

  const featured = inStock.filter((c) => c.featured).slice(0, 8);
  const popularPool = [...inStock].sort((a, b) => b.popularity - a.popularity);
  const hasPopularity = popularPool.filter((c) => c.popularity > 0).length >= 4;
  const popular = hasPopularity ? popularPool.slice(0, 8) : [];
  const latest = [...inStock].sort((a, b) => (b.newestListing ?? '').localeCompare(a.newestListing ?? '')).slice(0, 8);
  const deals = [...inStock].map((c) => ({ c, s: savedPct(c.fromPrice, c.newPrice) ?? 0 })).sort((a, b) => b.s - a.s).slice(0, 4);
  const brands = ['Lenovo', 'Dell', 'HP', 'Apple'].map((b) => {
    const mine = rows.filter((r) => r.brand === b);
    const img = mine.find((m) => m.featured && m.images.length)?.images[0] ?? mine.find((m) => m.images.length)?.images[0] ?? null;
    return { brand: b, img, units: mine.reduce((n, m) => n + m.units.length, 0), from: Math.min(...cards.filter((c) => c.brand === b && c.inStock).map((c) => c.fromPrice), Infinity) };
  });
  const budgets = BUDGETS.map((b) => ({ ...b, n: inStock.filter((c) => { const p = priceFor(c, []) / 100; return p >= b.min && p < b.max; }).length }));
  const procs = [
    { key: '8', label: 'Intel 8th–9th Gen', note: 'Everyday study and office', q: 'gen=8' },
    { key: '10', label: 'Intel 10th–11th Gen', note: 'Quad-core, Iris Xe on 11th', q: 'gen=10,11' },
    { key: '12', label: 'Intel 12th–13th Gen', note: 'Ten cores for heavy work', q: 'gen=12,13' },
    { key: 'ultra', label: 'Intel Core Ultra', note: 'Built-in AI engine', q: 'gen=ultra' },
    { key: 'm', label: 'Apple M-series', note: 'Silent, all-day battery', q: 'cpu=apple' },
  ].map((x) => ({ ...x, n: inStock.filter((c) => (x.key === 'm' ? /^m\d/.test(c.cpuTier) : x.key === '10' ? [10, 11].includes(c.cpuGen ?? 0) : x.key === '12' ? [12, 13].includes(c.cpuGen ?? 0) : GENS.find((g) => g.key === x.key)!.test(c))).length }));

  const faq: [string, string][] = [
    ['Is refurbished the same as second-hand?', `No. A second-hand laptop is sold as it is. Each of ours is tested on ${CHECK_COUNT} points, repaired with matching parts where needed, deep cleaned, wiped and reinstalled, graded, and covered by a ${POLICY.warrantyMonths}-month warranty.`],
    ['Will I get the exact laptop I see?', 'Yes. Every listing is a specific unit with its own ID, grade, measured battery and SSD health and cosmetic notes. The photos at the top of a model’s page are the manufacturer’s; your unit’s condition is described in its report.'],
    ['What does the warranty cover?', `Any hardware fault that isn’t caused by a drop, liquid or tampering, for ${POLICY.warrantyMonths} months from delivery. We collect it, repair it or replace it.`],
    ['What if I don’t like it?', `Return it within ${POLICY.returnDays} days of delivery for a refund. Start the return from your account and we arrange the pickup.`],
    ['How do I pay?', `UPI, cards, net banking and wallets through Razorpay, card EMI from 3 to 12 months${settings.shipping.codEnabled ? `, or pay on delivery for orders up to ${rupees(settings.shipping.codMax)}` : ''}.`],
    ['Do you sell to companies?', `Yes, with a GST invoice: add your GSTIN at checkout. For larger projects, see business orders, or rent from our sister company ${LEGAL.rentals.name}.`],
  ];

  const brandLines = ['ThinkPad', 'Latitude', 'EliteBook', 'MacBook', 'X1 Carbon', 'ProBook', 'MacBook Pro', 'Lenovo', 'Dell', 'HP', 'Apple'];

  return (
    <>
      {/* Hero: pinned while the laptop comes forward and the words lift away (scroll scene, as on GC Venture) */}
      <section data-scene="hero" className="hero-scene grain" aria-labelledby="hero-h">
        <div className="stage relative bg-[radial-gradient(120%_90%_at_70%_10%,#ffffff_0%,var(--color-ivory)_45%,var(--color-canvas)_100%)]">
          <div className="wrap grid min-h-[calc(100svh-76px)] items-center gap-10 py-12 lg:grid-cols-[1fr_1.15fr] lg:py-8">
            <div data-hero-copy className="relative z-10">
              <p className="eyebrow eyebrow-gold flex animate-[fade_1s_.1s_both] items-center gap-3"><span className="h-px w-8 bg-accent" aria-hidden="true" />Certified pre-owned · {unitsOnSale} laptops in the collection</p>
              <h1 id="hero-h" className="mt-5 text-[46px] leading-[0.98] sm:text-[64px] xl:text-[78px]">
                <span className="block overflow-hidden pb-1"><span className="block animate-[line-up_1.3s_var(--ease-lux)_.15s_both]">Exceptional</span></span>
                <span className="block overflow-hidden pb-1"><span className="block animate-[line-up_1.3s_var(--ease-lux)_.27s_both]">laptops, <em className="text-accent-ink">honestly</em></span></span>
                <span className="block overflow-hidden pb-2"><span className="block animate-[line-up_1.3s_var(--ease-lux)_.39s_both]">restored.</span></span>
              </h1>
              <p className="mt-6 max-w-[48ch] animate-[rise_1.1s_var(--ease-lux)_.55s_both] text-[17px] leading-relaxed text-ink-2">
                ThinkPad, Latitude, EliteBook and MacBook, each inspected on {CHECK_COUNT} points and sold as the exact unit you’ll receive: its grade, its measured battery health and every mark noted.
              </p>
              <div className="mt-8 flex animate-[rise_1.1s_var(--ease-lux)_.7s_both] flex-wrap items-center gap-x-8 gap-y-4">
                <Link href="/laptops" className="btn btn-primary btn-lg">Explore the collection</Link>
                <Link href="/how-we-test" className="btn-link">Our standard <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
              <dl className="mt-10 grid max-w-[520px] animate-[fade_1.2s_.9s_both] grid-cols-3 gap-6 border-t border-line-2 pt-6">
                {[[`${POLICY.warrantyMonths} months`, 'Warranty'], [`${POLICY.returnDays} days`, 'Free returns'], [`${CHECK_COUNT} points`, 'Inspection']].map(([a, b]) => (
                  <div key={b}><dt className="eyebrow !text-[10px]">{b}</dt><dd className="display mt-1.5 text-[24px]">{a}</dd></div>
                ))}
              </dl>
            </div>
            {heroProduct && cert ? (
              <div className="relative mx-auto w-full max-w-[680px]">
                <div data-hero-photo className="origin-center">
                  <div className="well relative aspect-[5/4] animate-[rise_1.4s_var(--ease-lux)_.2s_both] rounded-sheet bg-white p-10 shadow-[var(--shadow-pop)] ring-1 ring-line">
                    <Image src={heroProduct.images[0].src} alt={heroProduct.images[0].alt} width={heroProduct.images[0].width} height={heroProduct.images[0].height} priority sizes="(min-width: 1024px) 620px, 90vw" className="h-full w-full object-contain" />
                    <Link href={`/laptops/${heroProduct.slug}`} className="absolute left-6 top-6 text-[10.5px] font-medium uppercase tracking-[0.2em] text-mute hover:text-ink">{heroProduct.title} <span aria-hidden="true">→</span></Link>
                  </div>
                </div>
                <div data-hero-cert className="relative z-10 -mt-20 ml-auto mr-[-6px] w-[86%] max-w-[340px] sm:-mt-28 sm:mr-[-24px] lg:-mt-36">
                  <UnitCertificate u={cert} compact />
                </div>
              </div>
            ) : null}
          </div>
          <p data-hero-cue aria-hidden="true" className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-mute lg:flex">
            Scroll<span className="block h-10 w-px origin-top animate-[scan_2.4s_ease-in-out_infinite] bg-ink/40" />
          </p>
        </div>
      </section>

      <div className="hero-after">
        {/* The promise: rises over the hero */}
        <section aria-labelledby="promise-h" className="bg-ink text-ivory/70">
          <div className="wrap py-16 md:py-20">
            <h2 id="promise-h" className="sr-only">The {BRAND.name} promise</h2>
            <ul data-reveal className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['I', `${POLICY.warrantyMonths}-month warranty`, 'Repair, replacement or refund, in writing, tied to your laptop’s serial number.'],
                ['II', 'The exact unit you see', 'Every listing is one real laptop with its own report. No stock photos of “similar” units.'],
                ['III', `${POLICY.returnDays}-day returns`, 'Changed your mind? We collect it from your door and refund you in full.'],
                ['IV', 'Secure, invoiced payment', `UPI, cards and EMI through Razorpay, with a GST invoice on every order${settings.shipping.codEnabled ? ', or pay on delivery' : ''}.`],
              ].map(([n, t, d]) => (
                <li key={t} data-reveal-item className="border-t border-ivory/15 pt-6">
                  <span className="numeral text-[22px]">{n}</span>
                  <p className="display mt-3 text-[24px] text-ivory">{t}</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Marquee of the lines we restore */}
        <div aria-hidden="true" className="overflow-hidden border-b border-line bg-ivory py-7">
          <div className="marquee">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center">
                {brandLines.map((b) => <span key={b} className="display flex items-center whitespace-nowrap px-8 text-[34px] italic text-ink/80 md:text-[44px]">{b}<span className="ml-16 inline-block h-1.5 w-1.5 rotate-45 bg-accent" /></span>)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shop by brand */}
      <section className="wrap mt-28" aria-labelledby="brands-h">
        <SectionHead id="brands-h" eyebrow="The houses" title={<>Four makers, <em>chosen</em> for longevity</>} action={<Link href="/laptops" className="btn-link">Shop all <ArrowRight size={14} aria-hidden="true" /></Link>} />
        <ul data-reveal className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {brands.map((b) => (
            <li key={b.brand} data-reveal-item>
              <Link href={`/brands/${b.brand.toLowerCase()}`} className="group block">
                <div className="well aspect-[4/5] rounded-card bg-white p-8 ring-1 ring-line transition-shadow duration-500 group-hover:shadow-[var(--shadow-lift)]">
                  {b.img ? <Image src={b.img.src} alt="" width={b.img.width} height={b.img.height} sizes="(min-width:1024px) 320px, 45vw" className="h-full w-full object-contain transition-transform duration-[1.2s] ease-[var(--ease-lux)] group-hover:scale-[1.06]" /> : null}
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div><p className="display text-[26px] leading-none">{b.brand}</p><p className="mt-2 text-[12.5px] text-mute">{b.units} {b.units === 1 ? 'unit' : 'units'} in the collection</p></div>
                  {Number.isFinite(b.from) ? <p className="text-right text-[11px] uppercase tracking-[0.14em] text-mute">from<br /><span className="price text-[15px] normal-case tracking-normal text-ink">{rupees(b.from)}</span></p> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="wrap mt-32" aria-labelledby="featured-h">
          <SectionHead id="featured-h" eyebrow="Our picks this week" title={<>The <em>edit</em></>} intro="Models we would buy ourselves: proven builds, superb keyboards, easy to keep running for years." action={<Link href="/laptops?sort=rec" className="btn-link">See more <ArrowRight size={14} aria-hidden="true" /></Link>} />
          <Rail items={featured} wished={wished} label="Featured laptops" />
        </section>
      )}

      {/* Popular (from real views and orders) */}
      {popular.length > 0 && (
        <section className="wrap mt-32" aria-labelledby="popular-h">
          <SectionHead id="popular-h" eyebrow="Most sought after" title="Popular right now" intro="Ranked by what people viewed and bought in the last month." action={<Link href="/laptops?sort=popular" className="btn-link">All popular <ArrowRight size={14} aria-hidden="true" /></Link>} />
          <Rail items={popular} wished={wished} label="Popular laptops" />
        </section>
      )}

      {/* Inspection: the checklist ticks off as it moves up the screen */}
      <section className="band-ink mt-32" aria-labelledby="inspect-h">
        <div data-scene="ticks" data-start="0.85" data-end="0.55" className="wrap grid gap-14 py-24 lg:grid-cols-[1fr_1.25fr] lg:py-32">
          <div className="lg:sticky lg:top-36 lg:self-start">
            <p className="eyebrow !text-gold-hi flex items-center gap-3"><span className="h-px w-8 bg-accent" aria-hidden="true" />The {BRAND.name} standard</p>
            <h2 id="inspect-h" data-reveal="lines" className="mt-5 text-[42px] md:text-[60px]">
              <span className="line"><span>{CHECK_COUNT} checks.</span></span>
              <span className="line"><span><em className="text-gold-hi">Measured,</em> not guessed.</span></span>
            </h2>
            <p className="mt-6 max-w-[48ch] text-[16.5px] leading-relaxed">Every laptop goes through the same bench routine. What we measure goes on its report, and the report goes on its listing, so the laptop you choose is the one that arrives.</p>
            <div className="mt-10 max-w-[420px]">
              <p className="flex items-baseline justify-between text-[12px] uppercase tracking-[0.2em]"><span>Checks passed</span><span className="display text-[34px] normal-case tracking-normal text-ivory"><span data-tick-n>{CHECK_COUNT}</span><span className="text-ivory/40"> / {CHECK_COUNT}</span></span></p>
              <div className="mt-3 h-px bg-ivory/15"><div className="ticks-progress h-px bg-accent" /></div>
            </div>
            <Link href="/how-we-test" className="btn btn-accent mt-10">See every check <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="ticks grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {CHECKS.map((g) => (
              <div key={g.group}>
                <p className="display border-b border-ivory/15 pb-3 text-[22px] text-ivory">{g.group}</p>
                <ul className="mt-4 space-y-3 text-[14px]">
                  {g.items.map((it) => (
                    <li key={it} data-tick className="flex items-start gap-3">
                      <span className="tick mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-accent bg-accent text-ink"><Check size={11} strokeWidth={2.5} aria-hidden="true" /></span>
                      <span className="tick-label">{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The unit passport */}
      {cert ? (
        <section className="wrap mt-32 grid items-center gap-14 lg:grid-cols-[1fr_1fr]" aria-labelledby="passport-h">
          <div data-scene="drift" className="relative order-2 overflow-hidden rounded-sheet bg-canvas p-8 sm:p-14 lg:order-1">
            <div data-drift className="mx-auto max-w-[380px]"><UnitCertificate u={cert} /></div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHead id="passport-h" eyebrow="Every laptop has a passport" title={<>Know <em>exactly</em> what you are buying</>} />
            <ul data-reveal className="mt-10 space-y-7">
              {[
                ['Its own report', 'Measured battery and SSD health, charge cycles, every check and who inspected it, on a public page.'],
                ['Its own grade', 'Pristine, Excellent or Good, describing looks only, with every visible mark written down.'],
                ['Its own serial', 'Your warranty is registered to the serial number printed on your invoice.'],
              ].map(([t, d], i) => (
                <li key={t} data-reveal-item className="flex gap-6 border-t border-line pt-6">
                  <span className="numeral w-8 shrink-0 text-[26px] leading-none">0{i + 1}</span>
                  <span><b className="display block text-[22px] font-normal">{t}</b><span className="mt-1 block text-[15px] leading-relaxed text-mute">{d}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Latest arrivals */}
      {latest.length > 0 && (
        <section className="wrap mt-32" aria-labelledby="latest-h">
          <SectionHead id="latest-h" eyebrow="Just certified" title="Latest arrivals" intro="Freshly inspected units, newest first." action={<Link href="/laptops?sort=new" className="btn-link">All new arrivals <ArrowRight size={14} aria-hidden="true" /></Link>} />
          <Rail items={latest} wished={wished} label="Latest arrivals" />
        </section>
      )}

      {/* Deals */}
      {deals.length > 0 && (
        <section className="mt-32 bg-canvas py-24" aria-labelledby="deals-h">
          <div className="wrap">
            <SectionHead id="deals-h" eyebrow="Exceptional value" title={<>The finest <em>savings</em> against new</>} intro="Compared with each model’s approximate launch price in India." action={<Link href="/deals" className="btn btn-primary">All deals</Link>} />
            <ul data-reveal className="mt-12 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {deals.map(({ c }) => <li key={c.id} data-reveal-item><ProductCard p={c} wished={wished.has(c.id)} /></li>)}
            </ul>
          </div>
        </section>
      )}

      {/* Budget + processor */}
      <section className="wrap mt-32 grid gap-16 lg:grid-cols-2" aria-label="Shop by budget and processor">
        <div>
          <SectionHead eyebrow="By budget" title="What would you spend?" />
          <ul data-reveal className="mt-10 border-t border-line">
            {budgets.map((b) => (
              <li key={b.key} data-reveal-item>
                <Link href={`/laptops?budget=${b.key}`} className="group flex items-baseline justify-between gap-4 border-b border-line py-5">
                  <span className="display text-[30px] transition-transform duration-500 ease-[var(--ease-lux)] group-hover:translate-x-2 md:text-[36px]">{b.label}</span>
                  <span className="flex shrink-0 items-center gap-3 text-[12px] uppercase tracking-[0.16em] text-mute">{b.n} {b.n === 1 ? 'model' : 'models'} <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionHead eyebrow="By processor" title="Choose your power" />
          <ul data-reveal className="mt-10 border-t border-line">
            {procs.map((x) => (
              <li key={x.key} data-reveal-item>
                <Link href={`/laptops?${x.q}`} className="group flex items-center gap-5 border-b border-line py-5">
                  <span className="flex-1 transition-transform duration-500 ease-[var(--ease-lux)] group-hover:translate-x-2"><b className="display block text-[22px] font-normal">{x.label}</b><span className="text-[13.5px] text-mute">{x.note}</span></span>
                  <span className="text-[12px] uppercase tracking-[0.16em] text-mute">{x.n} {x.n === 1 ? 'model' : 'models'}</span>
                  <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Grades */}
      <section className="wrap mt-32" aria-labelledby="grades-h">
        <SectionHead id="grades-h" align="center" eyebrow="Condition grades" title={<>Three grades, <em>described plainly</em></>} intro="Grades describe looks only. Every grade passes the same checks and carries the same warranty." />
        <div data-reveal className="mt-14 grid gap-px overflow-hidden rounded-card bg-line ring-1 ring-line md:grid-cols-3">
          {GRADE_ORDER.map((g) => (
            <div key={g} data-reveal-item className="bg-white p-8 md:p-10">
              <div className="flex items-baseline justify-between"><p className="display text-[34px]">{GRADES[g].label}</p><span className="numeral text-[28px]">{GRADES[g].tone}</span></div>
              <p className="mt-2 text-[12px] uppercase tracking-[0.16em] text-accent-ink">{GRADES[g].short}</p>
              <p className="mt-5 text-[15px] leading-relaxed text-mute">{GRADES[g].body}</p>
              <p className="mt-8 flex items-center justify-between border-t border-line pt-5 text-[13px] text-mute">Battery health at least <b className="display text-[22px] font-normal text-ink">{GRADES[g].batteryMin}%</b></p>
            </div>
          ))}
        </div>
      </section>

      {/* After you buy */}
      <section className="wrap mt-32" aria-labelledby="warranty-h">
        <SectionHead id="warranty-h" eyebrow="After you buy" title={<>Covered from the <em>day it arrives</em></>} />
        <div data-reveal className="mt-12 grid gap-px overflow-hidden rounded-card bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            [`${POLICY.warrantyMonths}`, 'months', 'Warranty on every laptop, including the battery if its health falls below 50%.', '/warranty'],
            [`${POLICY.warrantyExtensions.at(-1)?.months ?? 24}`, 'months', `Extend to two years for ${rupees(POLICY.warrantyExtensions.at(-1)?.price ?? 0)} when you buy.`, '/warranty'],
            [`${POLICY.returnDays}`, 'days', 'Return it for any reason. We pick it up and refund you.', '/returns'],
            ['48', 'hours', 'Report a fault or transit damage and we replace it.', '/returns'],
          ].map(([a, unit, b, href]) => (
            <Link key={a + b} href={href} data-reveal-item className="group bg-white p-8 transition-colors hover:bg-ivory">
              <p className="flex items-baseline gap-2"><span className="display text-[60px] leading-none">{a}</span><span className="text-[12px] uppercase tracking-[0.18em] text-accent-ink">{unit}</span></p>
              <p className="mt-5 text-[14.5px] leading-relaxed text-mute">{b}</p>
            </Link>
          ))}
        </div>
        <ul className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-4 text-[12px] uppercase tracking-[0.16em] text-mute">
          {[[ShieldCheck, 'Warranty registered to your serial'], [Truck, settings.shipping.flatFee === 0 ? 'Free insured delivery' : 'Insured delivery'], [Lock, 'Payments secured by Razorpay'], [Receipt, 'GST invoice with every order']].map(([Icon, t]) => {
            const I = Icon as typeof ShieldCheck;
            return <li key={t as string} className="flex items-center gap-2.5"><I size={16} strokeWidth={1.5} className="text-accent-ink" aria-hidden="true" />{t as string}</li>;
          })}
        </ul>
      </section>

      {/* Why refurbished */}
      <section className="wrap mt-32" aria-labelledby="why-h">
        <div className="grid gap-14 border-y border-line py-20 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow eyebrow-gold">Why pre-owned</p>
            <h2 id="why-h" data-reveal="lines" className="mt-5 text-[38px] md:text-[54px]">
              <span className="line"><span>Better laptop.</span></span>
              <span className="line"><span><em>Smaller</em> bill.</span></span>
              <span className="line"><span>Less waste.</span></span>
            </h2>
          </div>
          <ul data-reveal className="grid gap-10 sm:grid-cols-2">
            {[
              ['Pay 40–70% less', 'A two-year-old business laptop costs a fraction of its launch price and outlasts a new budget model.'],
              ['Built for offices', 'Magnesium and aluminium bodies, spill-resistant keyboards and parts you can actually replace.'],
              ['Keep it out of landfill', 'Making a laptop produces most of its lifetime emissions. Using one longer is the greener choice.'],
              ['Covered like new', `${POLICY.warrantyMonths}-month warranty, ${POLICY.returnDays}-day returns and a real person on WhatsApp if anything goes wrong.`],
            ].map(([t, d], i) => (
              <li key={t} data-reveal-item><span className="numeral text-[22px]">0{i + 1}</span><p className="display mt-2 text-[24px]">{t}</p><p className="mt-2 text-[15px] leading-relaxed text-mute">{d}</p></li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials: only real, approved reviews */}
      {reviews.length >= 3 && (
        <section className="wrap mt-32" aria-labelledby="reviews-h">
          <SectionHead id="reviews-h" align="center" eyebrow="From our clients" title="In their words" intro="Verified purchases only, published after moderation." />
          <ul data-reveal className="mt-14 grid gap-5 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <li key={r.id} data-reveal-item className="flex flex-col rounded-card bg-white p-8 ring-1 ring-line">
                <Stars value={r.rating} size={13} />
                {r.title ? <p className="display mt-5 text-[22px]">{r.title}</p> : null}
                <p className="display mt-3 flex-1 text-[18px] italic leading-relaxed text-ink-2">“{r.body}”</p>
                <p className="mt-6 text-[11.5px] uppercase tracking-[0.16em] text-mute">{r.authorName}{r.city ? `, ${r.city}` : ''}{r.verified ? ' · Verified purchase' : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Students */}
      <section className="wrap mt-32">
        <div className="band-ink grain relative grid items-center gap-10 overflow-hidden rounded-sheet p-10 md:grid-cols-[1.4fr_1fr] md:p-16">
          <div>
            <p className="eyebrow !text-gold-hi">For students</p>
            <h2 data-reveal="lines" className="mt-4 text-[38px] md:text-[56px]">
              <span className="line"><span>{STUDENT.percent}% off,</span></span>
              <span className="line"><span><em className="text-gold-hi">for a whole year.</em></span></span>
            </h2>
            <p className="mt-5 max-w-[48ch] text-[16px] leading-relaxed">Verify once with your college email (instant) or a photo of your student ID, and the discount applies automatically at checkout for {STUDENT.validityMonths} months.</p>
          </div>
          <div className="flex flex-wrap gap-4 md:justify-end">
            <Link href="/students" className="btn btn-accent btn-lg">Verify in 2 minutes</Link>
            <Link href="/category/student" className="btn btn-lg text-ivory shadow-[inset_0_0_0_1px_rgba(250,248,243,.35)] hover:bg-ivory hover:text-ink">Student picks</Link>
          </div>
        </div>
      </section>

      {/* FAQ + newsletter */}
      <section className="wrap mt-32 grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" aria-labelledby="faq-h">
        <div>
          <SectionHead id="faq-h" eyebrow="Questions" title="Good to know" />
          <p className="mt-5 text-mute">More in the <Link href="/faq" className="link">full FAQ</Link>, or ask us on WhatsApp.</p>
          <div className="mt-12 border-t border-line pt-8">
            <p className="display text-[26px]">The private list</p>
            <p className="mt-2 text-[14.5px] text-mute">The best units go first. Hear when new laptops are certified, at most twice a month.</p>
            <div className="mt-5"><NewsletterForm tone="light" source="home" /></div>
          </div>
        </div>
        <Faq items={faq} />
      </section>
    </>
  );
}
