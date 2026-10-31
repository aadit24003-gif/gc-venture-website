import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, Battery, ClipboardCheck, GraduationCap, Lock, MousePointerClick, Plane, Receipt, RefreshCcw, ScanLine, ShieldCheck, Sparkles, Video, Wallet } from 'lucide-react';
import { BRAND, CHECK_COUNT, CHECKS, GRADES, GRADE_ORDER, LEGAL, POLICY, STUDENT } from '@/lib/config';
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
    <ul aria-label={label} data-reveal className="rail mt-8 auto-cols-[78%] sm:auto-cols-[45%] md:auto-cols-[31%] xl:auto-cols-[calc((100%-48px)/4)]">
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
  const card = (slug: string) => cards.find((c) => c.slug === slug && c.inStock) ?? null;
  const brandFrom = (b: string) => brands.find((x) => x.brand === b)?.from ?? Infinity;
  const fromLine = (slug: string, brand: string) => {
    const c = card(slug);
    const v = c ? c.fromPrice : brandFrom(brand);
    return Number.isFinite(v) ? `From ${rupees(v)}` : null;
  };
  const cut = (slug: string) => `/products/${slug}/cutout.webp`;
  const steps: [typeof Video, string, string][] = [
    [MousePointerClick, 'Choose your model', 'Pick the exact unit you want. Its grade, battery health and every mark are listed on its own report.'],
    [Wallet, book ? `Book it for ${book}` : 'Place your order', book ? 'Reserve it with a small online payment. It comes off the price, and the laptop is taken off sale for you.' : 'Pay online or choose pay on delivery. The laptop is taken off sale for you.'],
    [Video, 'Have a look on video', 'We video-call you and show your laptop switched on, from every side, with its serial number sticker.'],
    [ScanLine, 'Match the serial number', 'When it arrives, the serial (like a phone’s IMEI) must match the one on your order page.'],
    [BadgeCheck, 'Then finalise', book ? `Pay the rest on delivery only if it matches. ${POLICY.returnDays}-day returns and a ${POLICY.warrantyMonths}-month warranty.` : `${POLICY.returnDays}-day returns and a ${POLICY.warrantyMonths}-month warranty from the day it arrives.`],
  ];
  const saveFor = (brand: string) => { const v = Math.max(0, ...inStock.filter((c) => c.brand === brand).map((c) => savedPct(c.fromPrice, c.newPrice) ?? 0)); return v > 0 ? v : null; };
  const tiles = [
    { dark: true, title: 'Dell Latitude', sub: 'Built for the workday. Priced for yours.', from: fromLine('dell-latitude-5440', 'Dell'), save: saveFor('Dell'), href: '/brands/dell', img: cut('dell-latitude-5440'), alt: 'Dell Latitude 5440' },
    { dark: false, title: 'HP EliteBook', sub: 'Slim aluminium, all-day comfort.', from: fromLine('hp-elitebook-840-g10', 'HP'), save: saveFor('HP'), href: '/brands/hp', img: cut('hp-elitebook-840-g10'), alt: 'HP EliteBook 840 G10' },
    { dark: false, title: 'ThinkPad', sub: 'The keyboard everyone misses.', from: fromLine('lenovo-thinkpad-t14s-gen-2', 'Lenovo'), save: saveFor('Lenovo'), href: '/brands/lenovo', img: cut('lenovo-thinkpad-t14s-gen-2'), alt: 'Lenovo ThinkPad T14s' },
    { dark: true, title: 'MacBook Air', sub: 'Light. Silent. Ready for anything.', from: fromLine('apple-macbook-air-m3', 'Apple'), save: saveFor('Apple'), href: '/laptops?brand=Apple&q=air', img: cut('apple-macbook-air-m3'), alt: 'Apple MacBook Air' },
  ];
  const maxSave = Math.max(0, ...deals.map((x) => x.s)) || 60;
  const lowest = inStock.length ? Math.min(...inStock.map((c) => c.fromPrice)) : null;

  return (
    <>
      {/* Landing: glass brand tiles on a dark, softly glowing stage */}
      <section className="landing relative overflow-hidden bg-[#09090b] text-white" aria-labelledby="hero-h">
        <div className="orb left-[-10%] top-[-12%] h-[520px] w-[520px] bg-accent/45" aria-hidden="true" />
        <div className="orb orb-2 right-[-8%] top-[30%] h-[460px] w-[460px] bg-[#ff9a4a]/25" aria-hidden="true" />
        <div className="orb orb-3 bottom-[-10%] left-[30%] h-[420px] w-[620px] bg-white/10" aria-hidden="true" />
        <div className="wrap relative pb-8 pt-10 text-center md:pt-14">
          <p className="glass-dark mx-auto inline-flex animate-[fade_.8s_both] items-center gap-2 rounded-full px-4 py-1.5 text-[13.5px] text-white/85">
            <Sparkles size={15} className="text-gold-hi" aria-hidden="true" /> Business-grade laptops · up to <b className="text-white"><span data-count={maxSave}>{maxSave}</span>% below new</b>
          </p>
          <h1 id="hero-h" className="mx-auto mt-5 max-w-[18ch] animate-[rise_.9s_.08s_both] text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[46px] md:text-[56px]">
            Premium laptops. <span className="bg-gradient-to-r from-[#ffb08a] via-accent to-[#ff8a5c] bg-clip-text text-transparent">Surprisingly low prices.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[56ch] animate-[rise_.9s_.16s_both] text-[16px] text-white/65 md:text-[18px]">
            ThinkPad, Latitude, EliteBook and MacBook{lowest ? <> from {rupees(lowest)}</> : null}. Imported, inspected, and shown to you on video before you pay in full.
          </p>
        </div>
        <div data-reveal className="wrap relative grid gap-4 pb-6 md:grid-cols-2">
          {tiles.map((t) => (
            <div key={t.title} data-reveal-item data-spot data-scene="zoom" data-start="1" data-end="0.55"
              className={`spot group relative flex flex-col overflow-hidden rounded-[32px] px-6 pt-11 text-center md:pt-14 ${t.dark ? 'tile-dark glass-dark' : 'glass-light text-ink'}`}>
              <h2 className={`relative text-[32px] font-semibold tracking-[-0.03em] md:text-[44px] ${t.dark ? 'text-white' : ''}`}>{t.title}</h2>
              <p className={`relative mt-1 text-[17px] font-medium md:text-[20px] ${t.dark ? 'text-white/85' : 'text-ink-2'}`}>{t.sub}</p>
              <p className={`relative mt-2 flex flex-wrap items-center justify-center gap-2 text-[15px] ${t.dark ? 'text-white/60' : 'text-mute'}`}>
                {t.from}{t.save ? <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${t.dark ? 'bg-accent/20 text-gold-hi' : 'bg-accent-soft text-accent-ink'}`}>up to {t.save}% off</span> : null}
              </p>
              <div className="relative mt-5 flex flex-wrap justify-center gap-3">
                <Link href={t.href} className="btn btn-accent btn-sm shine">Shop</Link>
                <Link href="/compare" className="btn btn-line btn-sm">Compare</Link>
              </div>
              <div data-zoom className="relative mx-auto mt-8 aspect-[16/10] w-full max-w-[520px]">
                <Image src={t.img} alt={t.alt} fill sizes="(min-width: 768px) 520px, 90vw" className="object-contain object-bottom drop-shadow-[0_30px_40px_rgba(0,0,0,.45)] transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:-translate-y-2 group-hover:scale-[1.03]" />
              </div>
            </div>
          ))}
          <Link href="/students" data-reveal-item data-spot className="spot tile-dark glass-dark group relative flex flex-col items-center justify-center overflow-hidden rounded-[32px] px-6 py-12 text-center md:col-span-2">
            <span className="pointer-events-none absolute inset-x-0 -bottom-24 mx-auto h-48 w-2/3 rounded-full bg-accent/30 blur-3xl transition-opacity duration-500 group-hover:opacity-100 md:opacity-60" aria-hidden="true" />
            <GraduationCap size={38} className="relative text-gold-hi transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-6deg]" aria-hidden="true" />
            <p className="relative mt-3 text-[30px] font-semibold tracking-[-0.03em] md:text-[42px]">Students save {STUDENT.percent}%.</p>
            <p className="relative mt-1 text-[16px] text-white/65 md:text-[19px]">Verify once with your college email or ID. The price applies for a year.</p>
            <span className="btn btn-accent btn-sm shine relative mt-5">Verify now</span>
          </Link>
        </div>

        {/* Why trust us: the next scroll */}
        <div id="how" className="wrap relative scroll-mt-20 pb-24 pt-24" aria-labelledby="how-h">
          <div data-reveal className="mx-auto max-w-[760px] text-center">
            <p className="text-[14px] font-semibold text-gold-hi">Why trust {BRAND.name}?</p>
            <h2 id="how-h" className="mt-2 text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-white md:text-[52px]">You see it before you pay for it.</h2>
            <p className="mx-auto mt-4 max-w-[60ch] text-[16px] text-white/65 md:text-[18px]">Buying a pre-owned laptop online shouldn’t be a gamble. {book ? <>Book it for {book}, and</> : <>Once you order,</>} the responsibility to deliver the right laptop is ours.</p>
          </div>
          <div data-scene="steps" data-start="0.9" data-end="0.45" className="relative mt-14">
            <div className="absolute left-[10%] right-[10%] top-[34px] hidden h-px bg-white/15 lg:block" aria-hidden="true"><div className="steps-fill h-full bg-gradient-to-r from-accent to-[#ffb08a]" /></div>
            <ol data-reveal className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map(([I, t, d], i) => (
                <li key={t} data-reveal-item data-spot className="spot glass-dark group relative rounded-[24px] p-6 text-center">
                  <span className="relative mx-auto grid h-[68px] w-[68px] place-items-center rounded-full bg-gradient-to-b from-[#2a2a2e] to-[#121214] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.15)] ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-110">
                    <I size={26} aria-hidden="true" />
                    <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-[12px] font-bold">{i + 1}</span>
                  </span>
                  <p className="relative mt-5 text-[17px] font-semibold text-white">{t}</p>
                  <p className="relative mt-1.5 text-[14px] leading-relaxed text-white/60">{d}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-16 grid items-center gap-8 lg:grid-cols-[1fr_1.25fr]">
            {cert ? <div data-scene="drift" className="flex justify-center"><div data-drift className="w-full max-w-[380px]"><UnitCertificate u={cert} /></div></div> : null}
            <ul data-reveal className="grid gap-3 sm:grid-cols-2">
              {([
                [Plane, 'Imported, business-grade', 'All our laptops are imported business models: ThinkPad, Latitude, EliteBook and MacBook, built for years of daily work.'],
                [ClipboardCheck, `${CHECK_COUNT}-point inspection`, 'Display, battery, keyboard, ports, storage and more, with measured battery and SSD health on every report.'],
                [ShieldCheck, `${POLICY.warrantyMonths}-month warranty`, 'Registered to your laptop’s serial number. We collect it, repair it or replace it.'],
                [RefreshCcw, `${POLICY.returnDays}-day returns`, 'Changed your mind? We pick it up from your door and refund you.'],
                [Receipt, 'GST invoice', 'A proper GST invoice with every order. Add your GSTIN at checkout for business purchases.'],
                [Lock, 'Secure payment', 'Pay through Razorpay: UPI, cards, net banking or EMI. Card details never reach us.'],
              ] as [typeof Video, string, string][]).map(([I, t, d]) => (
                <li key={t} data-reveal-item data-spot className="spot glass-dark group rounded-[22px] p-5">
                  <I size={22} className="relative text-gold-hi transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-110" aria-hidden="true" />
                  <p className="relative mt-3 text-[16px] font-semibold text-white">{t}</p>
                  <p className="relative mt-1 text-[14px] text-white/60">{d}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href="/laptops" className="btn btn-accent shine">Choose your laptop</Link>
            <Link href="/faq" className="btn btn-line">Read the FAQ</Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="wrap mt-24" aria-labelledby="featured-h">
          <SectionHead id="featured-h" eyebrow="Our picks this week" title="The latest picks." intro="Proven models with great keyboards that are easy to keep running." action={<Link href="/laptops?sort=rec" className="btn-link">See all ›</Link>} />
          <Rail items={featured} wished={wished} label="Featured laptops" />
        </section>
      )}

      {/* Deals */}
      {deals.length > 0 && (
        <section className="wrap mt-24" aria-labelledby="deals-h">
          <SectionHead id="deals-h" eyebrow="Deals" title="Biggest savings against new." intro="Compared with each model’s approximate launch price in India." action={<Link href="/deals" className="btn-link">All deals ›</Link>} />
          <ul data-reveal className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map(({ c }) => <li key={c.id} data-reveal-item><ProductCard p={c} wished={wished.has(c.id)} /></li>)}
          </ul>
        </section>
      )}

      {/* Popular (from real views and orders) */}
      {popular.length > 0 && (
        <section className="wrap mt-24" aria-labelledby="popular-h">
          <SectionHead id="popular-h" eyebrow="Bestsellers" title="Popular right now." intro="Ranked by what people viewed and bought in the last month." action={<Link href="/laptops?sort=popular" className="btn-link">See all ›</Link>} />
          <Rail items={popular} wished={wished} label="Popular laptops" />
        </section>
      )}

      {/* Latest arrivals */}
      {latest.length > 0 && (
        <section className="wrap mt-24" aria-labelledby="latest-h">
          <SectionHead id="latest-h" eyebrow="Just in" title="New arrivals." intro="Freshly inspected units, newest first." action={<Link href="/laptops?sort=new" className="btn-link">See all ›</Link>} />
          <Rail items={latest} wished={wished} label="Latest arrivals" />
        </section>
      )}

      {/* Quick ways in */}
      <section className="wrap mt-24 text-center" aria-labelledby="find-h">
        <h2 id="find-h" data-reveal className="text-[30px] font-semibold tracking-[-0.03em] md:text-[40px]">Find the right one.</h2>
        <div className="mx-auto mt-6 flex max-w-[980px] flex-wrap justify-center gap-2">
          {budgets.map((b) => <Link key={b.key} href={`/laptops?budget=${b.key}`} className="chip">{b.label}</Link>)}
          {USES.map((u) => <Link key={u.key} href={`/laptops?use=${u.key}`} className="chip">{u.label}</Link>)}
          {procs.map((x) => <Link key={x.key} href={`/laptops?${x.q}`} className="chip">{x.label}</Link>)}
        </div>
      </section>

      {/* Grades */}
      <section className="wrap mt-24" aria-labelledby="grades-h">
        <SectionHead id="grades-h" align="center" eyebrow="Condition grades" title="Three grades. Explained simply." intro="Grades describe looks only. Every grade passes the same checks and gets the same warranty." />
        <div data-reveal className="mt-10 grid gap-3 md:grid-cols-3">
          {GRADE_ORDER.map((g) => (
            <div key={g} data-reveal-item className="rounded-card bg-canvas p-7">
              <div className="flex items-center justify-between gap-3"><p className="text-[24px] font-semibold tracking-[-0.02em]">{GRADES[g].label}</p><span className="rounded-full bg-white px-3 py-1 text-[13px] font-semibold">Grade {GRADES[g].tone}</span></div>
              <p className="mt-1 font-medium text-ink-2">{GRADES[g].short}</p>
              <p className="mt-3 text-[15px] text-mute">{GRADES[g].body}</p>
              <p className="mt-5 flex items-center justify-between border-t border-line-2 pt-4 text-[14.5px]"><span className="flex items-center gap-2"><Battery size={18} aria-hidden="true" /> Battery health at least</span><b className="text-[18px]">{GRADES[g].batteryMin}%</b></p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials: only real, approved reviews */}
      {reviews.length >= 3 && (
        <section className="wrap mt-24" aria-labelledby="reviews-h">
          <SectionHead id="reviews-h" align="center" eyebrow="From customers" title="What buyers say." intro="Verified purchases only, published after moderation." />
          <ul data-reveal className="mt-10 grid gap-3 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <li key={r.id} data-reveal-item className="flex flex-col rounded-card bg-canvas p-6">
                <Stars value={r.rating} />
                {r.title ? <p className="mt-3 font-semibold">{r.title}</p> : null}
                <p className="mt-2 flex-1 text-[15px] text-ink-2">“{r.body}”</p>
                <p className="mt-4 text-[13.5px] text-mute">{r.authorName}{r.city ? `, ${r.city}` : ''}{r.verified ? ' · Verified purchase' : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ + newsletter */}
      <section className="wrap mt-24 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" aria-labelledby="faq-h">
        <div>
          <SectionHead id="faq-h" eyebrow="Questions" title="Good to know." />
          <p className="mt-3 text-mute">More in the <Link href="/faq" className="link">full FAQ</Link>, or ask us on WhatsApp.</p>
          <div className="mt-8 rounded-card bg-canvas p-6">
            <p className="text-[18px] font-semibold">Get new stock alerts</p>
            <p className="mt-1 text-[14.5px] text-mute">Good units sell quickly. We email when fresh stock lands, at most twice a month.</p>
            <div className="mt-4"><NewsletterForm tone="light" source="home" /></div>
          </div>
        </div>
        <Faq items={faq} />
      </section>
    </>
  );
}
