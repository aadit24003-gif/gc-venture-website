import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, Battery, ClipboardCheck, Cpu, GraduationCap, MousePointerClick, Plane, Receipt, RefreshCcw, ScanLine, ShieldCheck, Video, Wallet } from 'lucide-react';
import { CHECK_COUNT, CHECKS, GRADES, GRADE_ORDER, LEGAL, POLICY, STUDENT } from '@/lib/config';
import { allProducts, toCard, type CardProduct } from '@/lib/products';
import { latestInspection } from '@/lib/inventory';
import { featuredReviews } from '@/lib/reviews';
import { getViewer } from '@/lib/auth/session';
import { wishlistIds } from '@/lib/shopping';
import { BUDGETS, GENS, USES, priceFor } from '@/lib/filters';
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
    <ul aria-label={label} data-reveal className="rail mt-6 auto-cols-[78%] sm:auto-cols-[45%] md:auto-cols-[31%] xl:auto-cols-[calc((100%-48px)/4)]">
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

  const heroCard = heroProduct ? cards.find((c) => c.id === heroProduct.id) ?? null : null;
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

  const bookAmt = settings.shipping.bookingEnabled ? rupees(settings.shipping.bookingAmount) : null;
  const faq: [string, string][] = [
    ...(bookAmt ? [
      [`How does booking for ${bookAmt} work?`, `Choose “Book now” at checkout and pay ${bookAmt} online. The laptop is taken off sale for you and the ${bookAmt} comes off its price. Before dispatch we video-call you and show this exact laptop, its condition and its serial number. You pay the balance on delivery, after matching the serial number.`],
      ['What if I don’t like what I see on the video call?', `Cancel before we dispatch it and your ${bookAmt} is refunded in full.`],
    ] as [string, string][] : []),
    ['Are your laptops imported?', 'Yes. All our laptops are imported business-grade models (Lenovo ThinkPad, Dell Latitude, HP EliteBook and Apple MacBook), inspected and graded by us before they are listed.'],
    ['How do I know I’ll get the laptop I paid for?', 'Your order page shows the serial number of your exact unit. We show it to you on a video call before dispatch, and you can check it against the sticker under the laptop on delivery. If it doesn’t match, don’t accept the delivery.'],
    ['Is refurbished the same as second-hand?', `No. A second-hand laptop is sold as it is. Each of ours is tested on ${CHECK_COUNT} points, repaired with matching parts where needed, deep cleaned, wiped and reinstalled, graded, and covered by a ${POLICY.warrantyMonths}-month warranty.`],
    ['Will I get the exact laptop I see?', 'Yes. Every listing is a specific unit with its own ID, grade, measured battery and SSD health and cosmetic notes. The photos at the top of a model’s page are the manufacturer’s; your unit’s condition is described in its report.'],
    ['What does the warranty cover?', `Any hardware fault that isn’t caused by a drop, liquid or tampering, for ${POLICY.warrantyMonths} months from delivery. We collect it, repair it or replace it.`],
    ['What if I don’t like it?', `Return it within ${POLICY.returnDays} days of delivery for a refund. Start the return from your account and we arrange the pickup.`],
    ['How do I pay?', `UPI, cards, net banking and wallets through Razorpay, card EMI from 3 to 12 months${settings.shipping.codEnabled ? `, or pay on delivery for orders up to ${rupees(settings.shipping.codMax)}` : ''}.`],
    ['Do you sell to companies?', `Yes, with a GST invoice: add your GSTIN at checkout. For larger projects, see business orders, or rent from our sister company ${LEGAL.rentals.name}.`],
  ];

  const book = settings.shipping.bookingEnabled ? rupees(settings.shipping.bookingAmount) : null;
  const maxSave = Math.max(0, ...deals.map((x) => x.s));
  const steps: [typeof Video, string, string][] = [
    [MousePointerClick, 'Choose your exact laptop', 'Every listing is one real, inspected unit with its own report: battery health, SSD health, grade and every mark noted.'],
    [Wallet, book ? `Book it for ${book}` : 'Place your order', book ? 'Reserve it with a small online payment. It comes off the price, and the laptop is taken off sale for you.' : 'Pay online or choose pay on delivery. The laptop is taken off sale for you.'],
    [Video, 'See it on a video call', 'Before dispatch we video-call you and show this exact laptop, its condition, and the serial number sticker.'],
    [ScanLine, 'Match the serial, then pay', book ? 'When it arrives, check the serial number against your order page. Pay the balance only if it matches.' : 'When it arrives, check the serial number against your order page. If it doesn’t match, don’t accept it.'],
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-canvas">
        <div className="wrap grid gap-4 py-5 md:py-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="relative overflow-hidden rounded-sheet bg-ink text-white">
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/40 blur-3xl" aria-hidden="true" />
            <div className="relative grid items-center gap-6 p-7 md:grid-cols-[1.1fr_1fr] md:p-10">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-gold-hi"><BadgeCheck size={15} aria-hidden="true" /> Imported · Inspected · Guaranteed</p>
                <h1 className="mt-4 text-[32px] leading-[1.1] text-white sm:text-[40px] xl:text-[46px]">Premium business laptops, <span className="text-gold-hi">checked on video</span> before you pay in full.</h1>
                <p className="mt-4 max-w-[46ch] text-[16px] text-white/75">ThinkPad, Latitude, EliteBook and MacBook at up to {maxSave || 60}% less than new. {unitsOnSale} inspected laptops in stock, each with its own report.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/laptops" className="btn btn-accent btn-lg">Shop laptops <ArrowRight size={18} aria-hidden="true" /></Link>
                  <a href="#how" className="btn btn-lg bg-white/10 text-white hover:bg-white/20">How it works</a>
                </div>
              </div>
              {heroProduct ? (
                <Link href={`/laptops/${heroProduct.slug}`} className="group relative block rounded-2xl bg-white p-5">
                  <Image src={heroProduct.images[0].src} alt={heroProduct.images[0].alt} width={heroProduct.images[0].width} height={heroProduct.images[0].height} priority sizes="(min-width: 1024px) 380px, 90vw" className="mx-auto aspect-[4/3] w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" />
                  <span className="mt-2 flex items-end justify-between gap-2 text-ink">
                    <span><span className="block text-[12.5px] font-semibold text-mute">{heroProduct.brand}</span><b className="text-[15px]">{heroProduct.title.replace(`${heroProduct.brand} `, '')}</b></span>
                    {heroCard ? <span className="text-right"><span className="block text-[11.5px] text-mute">from</span><span className="price text-[18px]">{rupees(heroCard.fromPrice)}</span></span> : null}
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Link href={book ? '#how' : '/how-we-test'} className="group relative overflow-hidden rounded-sheet bg-accent p-6 text-white">
              <Video size={30} aria-hidden="true" />
              <p className="mt-3 text-[22px] font-extrabold leading-tight">{book ? <>Book any laptop for {book}</> : 'See it on video first'}</p>
              <p className="mt-1.5 text-[14.5px] text-white/85">{book ? 'We show it to you on a video call. Pay the rest on delivery.' : 'We show you the exact laptop and its serial before dispatch.'}</p>
              <ol className="mt-4 hidden space-y-2 text-[14px] lg:block">
                {[book ? `Pay ${book} online to reserve it` : 'Order your exact laptop', 'See it live on a video call', 'Match the serial number on delivery'].map((t, i) => (
                  <li key={t} className="flex items-center gap-2.5"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/20 text-[12px] font-bold">{i + 1}</span>{t}</li>
                ))}
              </ol>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-bold">How booking works <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
            <Link href="/students" className="group relative overflow-hidden rounded-sheet border border-line bg-white p-6">
              <GraduationCap size={30} className="text-accent" aria-hidden="true" />
              <p className="mt-3 text-[22px] font-extrabold leading-tight">Students get {STUDENT.percent}% off</p>
              <p className="mt-1.5 text-[14.5px] text-mute">Verify once with your college email or ID. The price applies for a year.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-bold text-accent">Verify now <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section aria-label="Why buy here" className="border-b border-line bg-white">
        <ul data-reveal className="wrap grid grid-cols-2 gap-x-6 gap-y-5 py-6 text-[14px] md:grid-cols-3 xl:grid-cols-5">
          {([
            [Wallet, book ? `Book for ${book}` : 'Pay your way', book ? 'Balance on delivery' : 'UPI, cards, EMI or on delivery'],
            [Video, 'Video call before dispatch', 'See your exact laptop'],
            [ScanLine, 'Match the serial number', 'Check it when it arrives'],
            [ShieldCheck, `${POLICY.warrantyMonths}-month warranty`, 'Repair, replace or refund'],
            [RefreshCcw, `${POLICY.returnDays}-day returns`, 'Free pickup'],
          ] as [typeof Video, string, string][]).map(([I, t, d]) => (
            <li key={t} data-reveal-item className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><I size={21} aria-hidden="true" /></span>
              <span><b className="block text-[14.5px]">{t}</b><span className="text-mute">{d}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by brand */}
      <section className="wrap mt-14" aria-labelledby="brands-h">
        <SectionHead id="brands-h" eyebrow="Shop by brand" title="Top business laptop brands" action={<Link href="/laptops" className="btn-link">All laptops <ArrowRight size={16} aria-hidden="true" /></Link>} />
        <ul data-reveal className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {brands.map((b) => (
            <li key={b.brand} data-reveal-item>
              <Link href={`/brands/${b.brand.toLowerCase()}`} className="group flex items-center gap-4 rounded-card border border-line bg-white p-3 pr-4 transition hover:border-accent hover:shadow-[var(--shadow-lift)]">
                <span className="well h-20 w-24 shrink-0 rounded-xl p-1.5 sm:h-24 sm:w-28">
                  {b.img ? <Image src={b.img.src} alt="" width={b.img.width} height={b.img.height} sizes="120px" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" /> : null}
                </span>
                <span className="min-w-0">
                  <b className="block text-[18px]">{b.brand}</b>
                  <span className="block text-[13px] text-mute">{b.units} in stock</span>
                  {Number.isFinite(b.from) ? <span className="block text-[13px]">from <b>{rupees(b.from)}</b></span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          {budgets.map((b) => <Link key={b.key} href={`/laptops?budget=${b.key}`} className="chip">{b.label} <span className="text-faint">({b.n})</span></Link>)}
          {USES.map((u) => <Link key={u.key} href={`/laptops?use=${u.key}`} className="chip">{u.label}</Link>)}
        </div>
      </section>

      {/* Deals */}
      {deals.length > 0 && (
        <section className="wrap mt-16" aria-labelledby="deals-h">
          <SectionHead id="deals-h" eyebrow="Deals" title="Biggest savings against new" intro="Compared with each model’s approximate launch price in India." action={<Link href="/deals" className="btn-link">All deals <ArrowRight size={16} aria-hidden="true" /></Link>} />
          <ul data-reveal className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map(({ c }) => <li key={c.id} data-reveal-item><ProductCard p={c} wished={wished.has(c.id)} /></li>)}
          </ul>
        </section>
      )}

      {/* How it works / why trust us */}
      <section id="how" className="mt-20 scroll-mt-36 bg-canvas py-16" aria-labelledby="how-h">
        <div className="wrap">
          <SectionHead id="how-h" align="center" eyebrow="Why you can trust us" title={book ? <>Book for {book}. <em>We prove it</em> before you pay the rest.</> : <>You see it <em>before it ships</em></>} intro="Buying a used laptop online shouldn’t be a gamble. So the responsibility is ours: you see your exact laptop before it leaves us, and you check it when it reaches you." />
          <div data-scene="steps" data-start="0.95" data-end="0.5" className="relative mt-12">
            <div className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-0.5 bg-line-2 md:block" aria-hidden="true"><div className="steps-fill h-full bg-accent" /></div>
            <ol data-reveal className="relative grid gap-8 md:grid-cols-4">
              {steps.map(([I, t, d], i) => (
                <li key={t} data-reveal-item className="text-center">
                  <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,.7)]"><I size={24} aria-hidden="true" /><span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-[12px] font-bold">{i + 1}</span></span>
                  <p className="mt-4 text-[18px] font-bold">{t}</p>
                  <p className="mx-auto mt-1.5 max-w-[30ch] text-[14.5px] text-mute">{d}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
            {cert ? <div data-scene="drift" className="flex justify-center"><div data-drift className="w-full max-w-[380px]"><UnitCertificate u={cert} /></div></div> : null}
            <ul data-reveal className="grid gap-4 sm:grid-cols-2">
              {([
                [Plane, 'Imported, business-grade', 'All our laptops are imported business models: ThinkPad, Latitude, EliteBook and MacBook, built for years of daily work.'],
                [ClipboardCheck, `${CHECK_COUNT}-point inspection`, 'Display, battery, keyboard, ports, storage and more, with measured battery and SSD health on every report.'],
                [ShieldCheck, `${POLICY.warrantyMonths}-month warranty`, 'Registered to your laptop’s serial number. We collect it, repair it or replace it.'],
                [Receipt, 'GST invoice, secure payment', 'Pay through Razorpay (UPI, cards, EMI). Card details never reach us. A GST invoice comes with every order.'],
              ] as [typeof Video, string, string][]).map(([I, t, d]) => (
                <li key={t} data-reveal-item className="rounded-card border border-line bg-white p-5">
                  <I size={24} className="text-accent" aria-hidden="true" />
                  <p className="mt-3 text-[16.5px] font-bold">{t}</p>
                  <p className="mt-1 text-[14.5px] text-mute">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="wrap mt-16" aria-labelledby="featured-h">
          <SectionHead id="featured-h" eyebrow="Our picks this week" title="Featured laptops" intro="Proven models with great keyboards that are easy to keep running." action={<Link href="/laptops?sort=rec" className="btn-link">See more <ArrowRight size={16} aria-hidden="true" /></Link>} />
          <Rail items={featured} wished={wished} label="Featured laptops" />
        </section>
      )}

      {/* Popular (from real views and orders) */}
      {popular.length > 0 && (
        <section className="wrap mt-16" aria-labelledby="popular-h">
          <SectionHead id="popular-h" eyebrow="Bestsellers" title="Popular right now" intro="Ranked by what people viewed and bought in the last month." action={<Link href="/laptops?sort=popular" className="btn-link">All popular <ArrowRight size={16} aria-hidden="true" /></Link>} />
          <Rail items={popular} wished={wished} label="Popular laptops" />
        </section>
      )}

      {/* Latest arrivals */}
      {latest.length > 0 && (
        <section className="wrap mt-16" aria-labelledby="latest-h">
          <SectionHead id="latest-h" eyebrow="Just in" title="New arrivals" intro="Freshly inspected units, newest first." action={<Link href="/laptops?sort=new" className="btn-link">All new arrivals <ArrowRight size={16} aria-hidden="true" /></Link>} />
          <Rail items={latest} wished={wished} label="Latest arrivals" />
        </section>
      )}

      {/* Processor */}
      <section className="wrap mt-16" aria-labelledby="cpu-h">
        <SectionHead id="cpu-h" eyebrow="Shop by processor" title="Pick your power" />
        <ul data-reveal className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {procs.map((x) => (
            <li key={x.key} data-reveal-item>
              <Link href={`/laptops?${x.q}`} className="group flex h-full flex-col rounded-card border border-line bg-white p-5 transition hover:border-accent hover:shadow-[var(--shadow-lift)]">
                <Cpu size={24} className="text-accent" aria-hidden="true" />
                <b className="mt-3 text-[16px]">{x.label}</b>
                <span className="text-[13.5px] text-mute">{x.note}</span>
                <span className="mt-auto flex items-center justify-between pt-4 text-[13px] font-semibold">{x.n} {x.n === 1 ? 'model' : 'models'} <ArrowRight size={16} className="text-accent transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Grades */}
      <section className="wrap mt-16" aria-labelledby="grades-h">
        <SectionHead id="grades-h" eyebrow="Condition grades" title="Three grades, explained simply" intro="Grades describe looks only. Every grade passes the same checks and gets the same warranty." />
        <div data-reveal className="mt-6 grid gap-4 md:grid-cols-3">
          {GRADE_ORDER.map((g) => (
            <div key={g} data-reveal-item className="rounded-card border border-line bg-white p-6">
              <div className="flex items-center justify-between gap-3"><p className="text-[22px] font-extrabold">{GRADES[g].label}</p><span className="rounded-lg bg-accent-soft px-2.5 py-1 text-[13px] font-bold text-accent-ink">Grade {GRADES[g].tone}</span></div>
              <p className="mt-1 font-semibold text-ink-2">{GRADES[g].short}</p>
              <p className="mt-3 text-[15px] text-mute">{GRADES[g].body}</p>
              <p className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[14.5px]"><span className="flex items-center gap-2"><Battery size={18} className="text-accent" aria-hidden="true" /> Battery health at least</span><b className="text-[18px]">{GRADES[g].batteryMin}%</b></p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials: only real, approved reviews */}
      {reviews.length >= 3 && (
        <section className="wrap mt-16" aria-labelledby="reviews-h">
          <SectionHead id="reviews-h" eyebrow="From customers" title="What buyers say" intro="Verified purchases only, published after moderation." />
          <ul data-reveal className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <li key={r.id} data-reveal-item className="flex flex-col rounded-card border border-line bg-white p-6">
                <Stars value={r.rating} />
                {r.title ? <p className="mt-3 font-bold">{r.title}</p> : null}
                <p className="mt-2 flex-1 text-[15px] text-ink-2">“{r.body}”</p>
                <p className="mt-4 text-[13.5px] text-mute">{r.authorName}{r.city ? `, ${r.city}` : ''}{r.verified ? ' · Verified purchase' : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Students */}
      <section className="wrap mt-16">
        <div className="grid items-center gap-8 overflow-hidden rounded-sheet bg-accent p-8 text-white md:grid-cols-[1.4fr_1fr] md:p-12">
          <div>
            <p className="font-semibold text-white/80">Students</p>
            <h2 className="mt-2 text-[30px] text-white md:text-[40px]">{STUDENT.percent}% off for a whole year.</h2>
            <p className="mt-3 max-w-[48ch] text-[16px] text-white/85">Verify once with your college email (instant) or a photo of your student ID, and the discount applies automatically at checkout for {STUDENT.validityMonths} months.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/students" className="btn btn-lg bg-white text-accent-ink hover:bg-accent-soft">Verify in 2 minutes</Link>
            <Link href="/category/student" className="btn btn-lg bg-white/15 text-white hover:bg-white/25">Student picks</Link>
          </div>
        </div>
      </section>

      {/* FAQ + newsletter */}
      <section className="wrap mt-16 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" aria-labelledby="faq-h">
        <div>
          <SectionHead id="faq-h" eyebrow="Questions" title="Good to know" />
          <p className="mt-3 text-mute">More in the <Link href="/faq" className="link">full FAQ</Link>, or ask us on WhatsApp.</p>
          <div className="mt-8 rounded-card border border-line bg-canvas p-6">
            <p className="text-[18px] font-bold">Get new stock alerts</p>
            <p className="mt-1 text-[14.5px] text-mute">Good units sell quickly. We email when fresh stock lands, at most twice a month.</p>
            <div className="mt-4"><NewsletterForm tone="light" source="home" /></div>
          </div>
        </div>
        <Faq items={faq} />
      </section>
    </>
  );
}
