import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, Battery, Cpu, Leaf, PackageCheck, RefreshCcw, Search, ShieldCheck, Truck, Wallet } from 'lucide-react';
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
    <ul aria-label={label} className="rail mt-8 auto-cols-[78%] sm:auto-cols-[45%] md:auto-cols-[31%] xl:auto-cols-[calc((100%-48px)/4)]">
      {items.map((p, i) => <li key={p.id}><ProductCard p={p} wished={wished.has(p.id)} priority={i < 2} /></li>)}
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

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-canvas">
        <div className="wrap grid items-center gap-12 py-12 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="animate-rise">
            <p className="eyebrow">Certified refurbished · {unitsOnSale} units on sale now</p>
            <h1 className="mt-4 text-[42px] leading-[0.98] sm:text-[56px] xl:text-[66px]">
              <span className="block">Business-class laptops.</span>
              <span className="block text-mute">Half the price.</span>
              <span className="block">All the proof.</span>
            </h1>
            <p className="mt-6 max-w-[52ch] text-[17.5px] leading-relaxed text-ink-2">
              ThinkPads, Latitudes, EliteBooks and MacBooks, each inspected on {CHECK_COUNT} points and listed as the exact unit you’ll receive: its grade, measured battery health and every mark noted.
            </p>
            <form action="/laptops" className="mt-8 flex max-w-[560px] gap-2 rounded-2xl border border-line-2 bg-white p-1.5 shadow-[var(--shadow-card)] focus-within:border-ink" role="search">
              <label htmlFor="hero-q" className="sr-only">Search laptops</label>
              <Search size={19} className="ml-3 self-center text-mute" aria-hidden="true" />
              <input id="hero-q" name="q" placeholder="Try “T14 16GB” or “MacBook Air”" className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint" />
              <button className="btn btn-primary h-12 min-h-0">Search</button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {USES.map((u) => <Link key={u.key} href={`/laptops?use=${u.key}`} className="chip">{u.label}</Link>)}
            </div>
            <dl className="mt-10 grid max-w-[560px] grid-cols-3 gap-6 border-t border-line-2 pt-6">
              {[[`${POLICY.warrantyMonths} months`, 'warranty on every unit'], [`${POLICY.returnDays} days`, 'easy returns, free pickup'], [`${STUDENT.percent}% off`, 'for verified students']].map(([a, b]) => (
                <div key={b}><dt className="sr-only">{b}</dt><dd><span className="display block text-[22px] font-semibold">{a}</span><span className="text-[13.5px] text-mute">{b}</span></dd></div>
              ))}
            </dl>
          </div>
          {heroProduct && cert ? (
            <div className="relative mx-auto w-full max-w-[620px] animate-[rise_.8s_.1s_both]">
              <div className="well relative aspect-[5/4] rounded-[28px] border border-line p-8 shadow-[var(--shadow-lift)]">
                <Image src={heroProduct.images[0].src} alt={heroProduct.images[0].alt} width={heroProduct.images[0].width} height={heroProduct.images[0].height} priority sizes="(min-width: 1024px) 560px, 90vw" className="h-full w-full object-contain" />
                <Link href={`/laptops/${heroProduct.slug}`} className="absolute left-5 top-5 rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-ink-3">{heroProduct.title} →</Link>
              </div>
              <div className="relative -mt-24 ml-auto mr-[-8px] w-[86%] max-w-[340px] sm:-mt-32 sm:mr-[-28px] lg:-mt-40">
                <UnitCertificate u={cert} compact />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Why buy here" className="border-b border-line">
        <ul className="wrap grid grid-cols-2 gap-x-6 gap-y-5 py-6 text-[14px] md:grid-cols-4">
          {[
            [ShieldCheck, `${POLICY.warrantyMonths}-month warranty`, 'Repair, replace or refund'],
            [Truck, settings.shipping.flatFee === 0 ? 'Free insured delivery' : 'Insured delivery', `Ships in ${settings.shipping.dispatchMin}–${settings.shipping.dispatchMax} working days`],
            [RefreshCcw, `${POLICY.returnDays}-day returns`, 'Free pickup from your door'],
            [Wallet, 'UPI, cards and EMI', settings.shipping.codEnabled ? 'Or pay on delivery' : 'Secure checkout by Razorpay'],
          ].map(([Icon, t, s]) => {
            const I = Icon as typeof ShieldCheck;
            return <li key={t as string} className="flex items-start gap-3"><I size={22} className="mt-0.5 shrink-0" aria-hidden="true" /><span><b className="block font-semibold">{t as string}</b><span className="text-mute">{s as string}</span></span></li>;
          })}
        </ul>
      </section>

      {/* Shop by brand */}
      <section className="wrap mt-20" aria-labelledby="brands-h">
        <SectionHead id="brands-h" eyebrow="Shop by brand" title="The business lines that last" action={<Link href="/laptops" className="btn btn-ghost">All laptops <ArrowRight size={16} /></Link>} />
        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {brands.map((b) => (
            <li key={b.brand}>
              <Link href={`/brands/${b.brand.toLowerCase()}`} className="group block overflow-hidden rounded-[20px] border border-line bg-white transition hover:shadow-[var(--shadow-lift)]">
                <div className="well aspect-[4/3] p-6">
                  {b.img ? <Image src={b.img.src} alt="" width={b.img.width} height={b.img.height} sizes="(min-width:1024px) 300px, 45vw" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" /> : null}
                </div>
                <div className="flex items-end justify-between border-t border-line px-4 py-3.5">
                  <div><p className="display text-[20px] font-semibold">{b.brand}</p><p className="text-[13px] text-mute">{b.units} {b.units === 1 ? 'unit' : 'units'} on sale</p></div>
                  {Number.isFinite(b.from) ? <p className="text-right text-[12px] text-mute">from<br /><span className="price text-[16px]">{rupees(b.from)}</span></p> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="wrap mt-24" aria-labelledby="featured-h">
          <SectionHead id="featured-h" eyebrow="Featured" title="Our picks this week" intro="Models we’d buy ourselves: proven builds, good keyboards, easy to repair." action={<Link href="/laptops?sort=rec" className="btn btn-ghost">See more <ArrowRight size={16} /></Link>} />
          <Rail items={featured} wished={wished} label="Featured laptops" />
        </section>
      )}

      {/* Popular (from real views and orders) */}
      {popular.length > 0 && (
        <section className="wrap mt-24" aria-labelledby="popular-h">
          <SectionHead id="popular-h" eyebrow="Bestsellers" title="Popular right now" intro="Ranked by what people viewed and bought in the last month." action={<Link href="/laptops?sort=popular" className="btn btn-ghost">All popular <ArrowRight size={16} /></Link>} />
          <Rail items={popular} wished={wished} label="Popular laptops" />
        </section>
      )}

      {/* Inspection */}
      <section className="mt-24 bg-ink text-white" aria-labelledby="inspect-h">
        <div className="wrap grid gap-12 py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow !text-white/50">How we inspect</p>
            <h2 id="inspect-h" className="mt-3 text-[34px] text-white md:text-[46px]">{CHECK_COUNT} checks. Measured, not guessed.</h2>
            <p className="mt-5 max-w-[52ch] text-[17px] text-white/70">Each laptop goes through the same bench routine. What we measure goes on its report, and the report goes on its listing, so the laptop you choose is the one that arrives.</p>
            <ol className="mt-8 space-y-5">
              {[
                ['Intake', 'Serial logged, ownership locks checked (BIOS, MDM, iCloud), history recorded.'],
                ['Bench test', `${CHECK_COUNT} checks across display, battery, keyboard, storage, ports, sensors and software.`],
                ['Refurbish', 'Worn parts replaced with matching ones; every part swap is logged on the unit.'],
                ['Measure and grade', 'Battery and SSD health measured; cosmetic grade assigned; marks described in words.'],
                ['Final check', 'Re-tested after your order, before it is packed with its charger.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="mono grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/25 text-[12px]">{i + 1}</span>
                  <span><b className="block text-white">{t}</b><span className="text-[15px] text-white/65">{d}</span></span>
                </li>
              ))}
            </ol>
            <Link href="/how-we-test" className="btn btn-accent mt-9">See every check <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CHECKS.slice(0, 6).map((g) => (
              <div key={g.group} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="font-semibold text-white">{g.group}</p>
                <ul className="mt-3 space-y-1.5 text-[13.5px] text-white/65">
                  {g.items.map((it) => <li key={it} className="flex gap-2"><BadgeCheck size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest arrivals */}
      {latest.length > 0 && (
        <section className="wrap mt-24" aria-labelledby="latest-h">
          <SectionHead id="latest-h" eyebrow="Just in" title="Latest arrivals" intro="Freshly inspected units, newest first." action={<Link href="/laptops?sort=new" className="btn btn-ghost">All new arrivals <ArrowRight size={16} /></Link>} />
          <Rail items={latest} wished={wished} label="Latest arrivals" />
        </section>
      )}

      {/* Deals */}
      {deals.length > 0 && (
        <section className="wrap mt-24" aria-labelledby="deals-h">
          <div className="rounded-[28px] bg-accent-soft p-6 md:p-10">
            <SectionHead id="deals-h" eyebrow="Deals" title="The biggest savings against new" intro="Compared with each model’s approximate launch price in India." action={<Link href="/deals" className="btn btn-primary">All deals <ArrowRight size={16} /></Link>} />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {deals.map(({ c }) => <li key={c.id}><ProductCard p={c} wished={wished.has(c.id)} /></li>)}
            </ul>
          </div>
        </section>
      )}

      {/* Budget + processor */}
      <section className="wrap mt-24 grid gap-10 lg:grid-cols-2" aria-label="Shop by budget and processor">
        <div>
          <SectionHead eyebrow="Shop by budget" title="What can you spend?" />
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {budgets.map((b) => (
              <li key={b.key}>
                <Link href={`/laptops?budget=${b.key}`} className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-white p-5 transition hover:border-ink">
                  <span className="display text-[24px] font-semibold">{b.short}</span>
                  <span className="mt-6 flex items-center justify-between text-[13.5px] text-mute">{b.n} {b.n === 1 ? 'model' : 'models'} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionHead eyebrow="Shop by processor" title="Pick your power" />
          <ul className="mt-6 space-y-2">
            {procs.map((x) => (
              <li key={x.key}>
                <Link href={`/laptops?${x.q}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-white px-5 py-4 transition hover:border-ink">
                  <Cpu size={22} aria-hidden="true" className="shrink-0" />
                  <span className="flex-1"><b className="block">{x.label}</b><span className="text-[13.5px] text-mute">{x.note}</span></span>
                  <span className="text-[13px] text-mute">{x.n} {x.n === 1 ? 'model' : 'models'}</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Grades */}
      <section className="wrap mt-24" aria-labelledby="grades-h">
        <SectionHead id="grades-h" eyebrow="Condition grades" title="Three grades, described plainly" intro="Grades describe looks only. Every grade passes the same checks and gets the same warranty." />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {GRADE_ORDER.map((g) => (
            <div key={g} className="rounded-[20px] border border-line bg-white p-6">
              <div className="flex items-center justify-between"><p className="display text-[24px] font-semibold">{GRADES[g].label}</p><span className="mono rounded-md bg-canvas px-2 py-1 text-[12px]">{GRADES[g].tone}</span></div>
              <p className="mt-1 font-medium">{GRADES[g].short}</p>
              <p className="mt-3 text-[15px] text-mute">{GRADES[g].body}</p>
              <p className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-[14px]"><Battery size={18} aria-hidden="true" /> Battery at least <b className="mono">{GRADES[g].batteryMin}%</b></p>
            </div>
          ))}
        </div>
      </section>

      {/* Why refurbished */}
      <section className="wrap mt-24" aria-labelledby="why-h">
        <div className="grid gap-10 rounded-[28px] border border-line bg-canvas p-6 md:p-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">Why refurbished</p>
            <h2 id="why-h" className="mt-3 text-[32px] md:text-[42px]">Better laptop, smaller bill, less waste.</h2>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2">
            {[
              [Wallet, 'Pay 40–70% less', 'A two-year-old business laptop costs a fraction of its launch price and outlasts a new budget model.'],
              [PackageCheck, 'Built for offices', 'Magnesium and aluminium bodies, spill-resistant keyboards and parts you can actually replace.'],
              [Leaf, 'Keep it out of landfill', 'Making a laptop produces most of its lifetime emissions. Using one longer is the greenest choice.'],
              [ShieldCheck, 'Covered like new', `${POLICY.warrantyMonths}-month warranty, ${POLICY.returnDays}-day returns and a real person on WhatsApp if anything goes wrong.`],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Wallet;
              return <li key={t as string}><I size={24} aria-hidden="true" /><p className="mt-3 text-[17px] font-semibold">{t as string}</p><p className="mt-1 text-[15px] text-mute">{d as string}</p></li>;
            })}
          </ul>
        </div>
      </section>

      {/* Warranty highlights */}
      <section className="wrap mt-24" aria-labelledby="warranty-h">
        <SectionHead id="warranty-h" eyebrow="After you buy" title="Covered from the day it arrives" />
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            [`${POLICY.warrantyMonths} months`, 'Warranty on every laptop, including the battery if its health falls below 50%.', '/warranty'],
            [`${POLICY.warrantyExtensions.at(-1)?.months ?? 24} months`, `Extend to two years for ${rupees(POLICY.warrantyExtensions.at(-1)?.price ?? 0)} when you buy.`, '/warranty'],
            [`${POLICY.returnDays} days`, 'Return it for any reason. We pick it up and refund you.', '/returns'],
            ['48 hours', 'Report a fault or transit damage and we replace it.', '/returns'],
          ].map(([a, b, href]) => (
            <Link key={a + b} href={href} className="group rounded-[20px] border border-line bg-white p-6 transition hover:border-ink">
              <p className="price text-[34px]">{a}</p>
              <p className="mt-2 text-[15px] text-mute">{b}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials: only real, approved reviews */}
      {reviews.length >= 3 && (
        <section className="wrap mt-24" aria-labelledby="reviews-h">
          <SectionHead id="reviews-h" eyebrow="From customers" title="What buyers say" intro="Verified purchases only, published after moderation." />
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <li key={r.id} className="flex flex-col rounded-[20px] border border-line bg-white p-6">
                <Stars value={r.rating} />
                {r.title ? <p className="mt-3 font-semibold">{r.title}</p> : null}
                <p className="mt-2 flex-1 text-[15px] text-ink-2">“{r.body}”</p>
                <p className="mt-4 text-[13.5px] text-mute">{r.authorName}{r.city ? `, ${r.city}` : ''}{r.verified ? ' · Verified purchase' : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Students */}
      <section className="wrap mt-24">
        <div className="grid items-center gap-8 overflow-hidden rounded-[28px] bg-ink p-8 text-white md:grid-cols-[1.4fr_1fr] md:p-12">
          <div>
            <p className="eyebrow !text-white/50">Students</p>
            <h2 className="mt-3 text-[32px] text-white md:text-[44px]">{STUDENT.percent}% off for a whole year.</h2>
            <p className="mt-4 max-w-[48ch] text-[16.5px] text-white/70">Verify once with your college email (instant) or a photo of your student ID, and the discount applies automatically at checkout for {STUDENT.validityMonths} months.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/students" className="btn btn-accent btn-lg">Verify in 2 minutes</Link>
            <Link href="/category/student" className="btn btn-lg bg-white/10 text-white hover:bg-white/20">Student picks</Link>
          </div>
        </div>
      </section>

      {/* FAQ + newsletter */}
      <section className="wrap mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="faq-h">
        <div>
          <SectionHead id="faq-h" eyebrow="Questions" title="Good to know" />
          <p className="mt-4 text-mute">More in the <Link href="/faq" className="link">full FAQ</Link>, or ask us on WhatsApp.</p>
          <div className="mt-10 rounded-[20px] border border-line bg-canvas p-6">
            <p className="text-[18px] font-semibold">New units, first</p>
            <p className="mt-1 text-[14.5px] text-mute">Good units sell quickly. Get an email when fresh stock lands, at most twice a month.</p>
            <div className="mt-4"><NewsletterForm tone="light" source="home" /></div>
          </div>
        </div>
        <Faq items={faq} />
      </section>
    </>
  );
}
