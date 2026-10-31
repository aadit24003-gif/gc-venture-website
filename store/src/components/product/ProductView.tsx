'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BadgePercent, Banknote, Check, ChevronDown, MapPin, MessageCircle, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import type { ArtSpec, ProductImage, UpgradeOption } from '@/lib/db/schema';
import { GRADES, GRADE_ORDER, POLICY, STUDENT, whatsappLink, type GradeKey } from '@/lib/config';
import { emiPerMonth, savedPct, studentUnitDiscount, unitPrice } from '@/lib/pricing';
import { gb, rupees } from '@/lib/format';
import { deliveryWindow, shortDate } from '@/lib/delivery';
import { useCart } from '../cart/CartContext';
import AnimatedNumber from '../AnimatedNumber';
import LaptopArt from '../LaptopArt';
import LidMarks from '../LidMarks';
import ConditionTag, { skuFor } from '../ConditionTag';
import CompareToggle from '../compare/CompareToggle';

export type ViewProduct = {
  id: string; slug: string; title: string; brand: string; model: string; year: number | null;
  summary: string; art: ArtSpec; newPrice: number | null; images: ProductImage[];
  ramOptions: UpgradeOption[]; ssdOptions: UpgradeOption[];
  variants: { grade: string; price: number; stock: number; active: boolean }[];
};

type Student = 'approved' | 'pending' | 'none';

export default function ProductView({ p, student, initial }: { p: ViewProduct; student: Student; initial: { grade?: string; ram?: number; ssd?: number } }) {
  const { add } = useCart();
  const router = useRouter();
  const firstInStock = GRADE_ORDER.find((g) => p.variants.some((v) => v.grade === g && v.stock > 0 && v.active)) ?? 'excellent';
  const [grade, setGrade] = useState<GradeKey>(
    initial.grade && initial.grade in GRADES && p.variants.some((v) => v.grade === initial.grade && v.active) ? (initial.grade as GradeKey) : (p.variants.find((v) => v.grade === 'excellent' && v.stock > 0) ? 'excellent' : firstInStock),
  );
  const [ram, setRam] = useState(p.ramOptions.some((o) => o.gb === initial.ram) ? initial.ram! : p.ramOptions[0].gb);
  const [ssd, setSsd] = useState(p.ssdOptions.some((o) => o.gb === initial.ssd) ? initial.ssd! : p.ssdOptions[0].gb);
  const [warranty, setWarranty] = useState<number>(POLICY.warrantyExtensions[0].months);
  const [view, setView] = useState<'front' | 'photos' | 'lid'>(p.images.length ? 'photos' : 'front');
  const [photo, setPhoto] = useState(0);
  const [emiOpen, setEmiOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinResult, setPinResult] = useState<{ text: string; ok: boolean; city?: string } | null>(null);
  const buyRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  const variant = p.variants.find((v) => v.grade === grade)!;
  const price = unitPrice(p, { grade, ramGb: ram, ssdGb: ssd, warrantyMonths: warranty }) ?? variant.price;
  const soldOut = !variant || variant.stock <= 0;
  const saved = savedPct(price, p.newPrice);
  const studentPrice = price - studentUnitDiscount(price);
  const sku = skuFor(p.slug, grade);

  useEffect(() => {
    const q = new URLSearchParams();
    if (grade !== 'excellent') q.set('grade', grade);
    if (ram !== p.ramOptions[0].gb) q.set('ram', String(ram));
    if (ssd !== p.ssdOptions[0].gb) q.set('ssd', String(ssd));
    const url = `${window.location.pathname}${q.size ? `?${q}` : ''}`;
    window.history.replaceState(null, '', url);
  }, [grade, ram, ssd, p.ramOptions, p.ssdOptions]);

  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const line = () => ({
    productId: p.id, slug: p.slug, title: p.title, brand: p.brand, art: p.art,
    grade, ramGb: ram, ssdGb: ssd, warrantyMonths: warranty, unit: price, maxQty: Math.min(5, variant.stock),
  });

  async function checkPin(e: React.FormEvent) {
    e.preventDefault();
    const w = deliveryWindow(pin);
    if (!w) { setPinResult({ ok: false, text: 'Enter a 6-digit PIN code.' }); return; }
    const cod = POLICY.cod.enabled && price <= POLICY.cod.maxOrder;
    setPinResult({ ok: true, text: `Free delivery between ${shortDate(w.from)} and ${shortDate(w.to)}.${cod ? ' Pay on delivery available.' : ''}` });
    try {
      const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const d = (await r.json()) as { Status: string; PostOffice?: { District: string; State: string }[] }[];
      const po = d?.[0]?.PostOffice?.[0];
      if (po) setPinResult((s) => (s ? { ...s, city: `${po.District}, ${po.State}` } : s));
    } catch { /* city name is a nice-to-have */ }
  }

  const tabs = useMemo(() => [
    p.images.length ? { key: 'photos' as const, label: `Photos (${p.images.length})` } : { key: 'front' as const, label: 'Front' },
    { key: 'lid' as const, label: `Lid, ${GRADES[grade].label.toLowerCase()}` },
  ], [grade, p.images.length]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-14">
      {/* Gallery and condition tag */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative rounded-[32px] bg-white px-6 pb-8 pt-14 md:px-12">
          <div className="absolute left-5 top-5 flex gap-1 rounded-xl bg-bench p-1" role="tablist" aria-label="Views">
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={view === t.key} onClick={() => setView(t.key)}
                className="rounded-lg px-3 py-1.5 text-[13.5px] font-medium text-mute aria-selected:bg-white aria-selected:text-spruce aria-selected:shadow-sm">
                {t.label}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={{ opacity: 0, rotateX: view === 'lid' ? -20 : 20 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} style={{ perspective: 800 }}>
              {view === 'photos' && p.images[photo] ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[photo].src} alt={p.images[photo].alt} className="mx-auto aspect-[4/3] w-full max-w-[600px] rounded-2xl object-contain" />
                  {p.images.length > 1 && (
                    <div className="mt-4 flex justify-center gap-2">
                      {p.images.map((im, i) => (
                        <button key={im.src} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} aria-pressed={i === photo}
                          className="h-14 w-14 overflow-hidden rounded-xl ring-2 ring-transparent aria-pressed:ring-spruce">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={im.src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : view === 'front'
                ? <LaptopArt art={p.art} brand={p.brand} slug={p.slug} className="mx-auto w-full max-w-[560px]" title={`${p.title}, illustration`} />
                : <LidMarks colour={p.art.colour} grade={grade} brand={p.brand} className="mx-auto w-full max-w-[520px]" annotate />}
            </motion.div>
          </AnimatePresence>
          <p className="mt-2 text-center text-[13px] text-mute">
            {view === 'front' ? 'Illustration. Photos of the exact unit are sent on WhatsApp before dispatch, on request.' : view === 'photos' ? 'Photos from our stock of this model. Ask on WhatsApp for photos of the exact unit.' : GRADES[grade].body}
          </p>
        </div>
        <div className="relative -mt-6 hidden justify-end pr-8 lg:flex">
          <span className="absolute right-[calc(2rem+125px)] top-0 h-6 w-px bg-spruce/40" aria-hidden />
          <motion.div key={grade} initial={{ rotate: -6, y: -6 }} animate={{ rotate: 2, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 9 }} className="mt-5 origin-top">
            <ConditionTag grade={grade} sku={sku} hole="var(--color-bench)" className="[--tag-w:250px]" />
          </motion.div>
        </div>
      </div>

      {/* Configuration */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] text-mute">{p.brand}{p.year ? `, ${p.year} model` : ''}, certified refurbished</p>
          <CompareToggle slug={p.slug} title={p.title} className="!bg-white" />
        </div>
        <h1 className="mt-1 text-[38px] md:text-[50px]">{p.title}</h1>
        <p className="mt-2 text-[16px] text-mute">{p.summary}</p>

        <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="price text-[46px] leading-none md:text-[54px]" aria-live="polite">
            <AnimatedNumber value={price} format={(n) => rupees(n)} />
          </p>
          {p.newPrice && saved && (
            <p className="pb-1.5 text-[15px] text-mute">
              <span className="font-semibold text-pass">You save {saved}%</span> on the new price of about {rupees(p.newPrice)}
            </p>
          )}
        </div>
        <p className="mt-1 text-[14px] text-mute">Inclusive of GST. Free delivery.</p>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-tag-soft px-4 py-3 text-[15px]">
          <BadgePercent size={20} className="mt-0.5 shrink-0 text-spruce" />
          {student === 'approved' ? (
            <p><span className="font-semibold">Your student price: {rupees(studentPrice)}.</span> The {STUDENT.percent}% discount is applied at checkout.</p>
          ) : student === 'pending' ? (
            <p>Students pay <span className="font-semibold">{rupees(studentPrice)}</span>. Your student ID is being checked; we’ll email you when it’s approved.</p>
          ) : (
            <p>Students pay <span className="font-semibold">{rupees(studentPrice)}</span> with {STUDENT.percent}% off. <Link href="/students" className="link font-semibold">Verify once with your college ID</Link></p>
          )}
        </div>

        <fieldset className="mt-8">
          <legend className="mb-3 flex w-full items-baseline justify-between text-[16px] font-semibold text-spruce">
            Condition <Link href="/how-we-test#grades" className="text-[14px] font-normal text-mute underline underline-offset-2">What the grades mean</Link>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {GRADE_ORDER.map((g) => {
              const v = p.variants.find((x) => x.grade === g && x.active);
              if (!v) return null;
              const out = v.stock <= 0;
              return (
                <label key={g} className={`relative cursor-pointer rounded-2xl border-[1.5px] bg-white p-3 transition-colors has-[:checked]:border-spruce has-[:checked]:bg-white has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-tag-2 ${out ? 'border-dashed border-line bg-bench/60' : 'border-line hover:border-spruce/50'}`}>
                  <input type="radio" name="grade" value={g} checked={grade === g} onChange={() => setGrade(g)} className="sr-only" />
                  <span className="block text-[15px] font-semibold text-spruce">{GRADES[g].label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-mute">{GRADES[g].short}</span>
                  <span className="mt-2 block price text-[18px]">{rupees(v.price)}</span>
                  <span className={`mt-1 block text-[12.5px] ${out ? 'text-alert' : 'text-pass'}`}>{out ? 'Sold out' : v.stock <= 2 ? `Only ${v.stock} left` : 'In stock'}</span>
                  {grade === g && <motion.span layoutId="grade-check" className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-spruce text-white"><Check size={13} strokeWidth={3} /></motion.span>}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Options title="Memory" options={p.ramOptions} value={ram} onChange={setRam} note={p.ramOptions.length === 1 ? 'Built in. This model’s memory cannot be upgraded.' : 'Fitted and tested before dispatch.'} />
        <Options title="Storage" options={p.ssdOptions} value={ssd} onChange={setSsd} note={p.ssdOptions.length === 1 ? 'Built in.' : 'New NVMe SSD for upgrades.'} />

        <fieldset className="mt-7">
          <legend className="mb-3 text-[16px] font-semibold text-spruce">Warranty</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {POLICY.warrantyExtensions.map((w) => (
              <label key={w.months} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 has-[:checked]:border-spruce has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-tag-2">
                <input type="radio" name="warranty" className="sr-only" checked={warranty === w.months} onChange={() => setWarranty(w.months)} />
                <span>
                  <span className="block text-[15px] font-semibold text-spruce">{w.months / 12 === 1 ? '1 year' : `${w.months / 12} years`}</span>
                  <span className="block text-[13px] text-mute">{w.price ? w.label : 'Included'}</span>
                </span>
                <span className="text-[15px] font-semibold text-ink">{w.price ? `+${rupees(w.price)}` : 'Free'}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div ref={buyRef} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn btn-primary btn-lg flex-1" disabled={soldOut} onClick={() => add(line())}>
            {soldOut ? `${GRADES[grade].label} is sold out` : 'Add to cart'}
          </button>
          <button type="button" className="btn btn-tag btn-lg flex-1" disabled={soldOut} onClick={() => { add(line(), { open: false }); router.push('/checkout'); }}>
            Buy now
          </button>
        </div>

        <a href={whatsappLink(`Hi, I'm looking at the ${p.title} (${GRADES[grade].label}, ${gb(ram)}, ${gb(ssd)}). Can you send photos of the unit?`)} target="_blank" rel="noopener"
          className="mt-3 flex items-center justify-center gap-2 text-[15px] font-medium text-spruce underline-offset-4 hover:underline">
          <MessageCircle size={17} /> Ask for photos of this unit on WhatsApp
        </a>

        {price >= POLICY.emi.minOrder && (
          <div className="mt-4 rounded-2xl bg-white">
            <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px]" onClick={() => setEmiOpen((o) => !o)} aria-expanded={emiOpen}>
              <span>EMI from <span className="font-semibold">{rupees(emiPerMonth(price, 12))}/month</span> on credit cards</span>
              <ChevronDown size={18} className={`transition-transform ${emiOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {emiOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <table className="mx-4 mb-2 w-[calc(100%-2rem)] text-[14.5px]">
                    <thead><tr className="text-left text-mute"><th className="py-1.5 font-medium">Months</th><th className="py-1.5 font-medium">Per month</th><th className="py-1.5 text-right font-medium">Total</th></tr></thead>
                    <tbody>
                      {POLICY.emi.tenures.map((m) => {
                        const per = emiPerMonth(price, m);
                        return <tr key={m} className="border-t border-line"><td className="py-2">{m}</td><td className="py-2 font-semibold">{rupees(per)}</td><td className="py-2 text-right text-mute">{rupees(per * m)}</td></tr>;
                      })}
                    </tbody>
                  </table>
                  <p className="px-4 pb-4 text-[13px] text-mute">Estimated at {Math.round(POLICY.emi.annualRate * 100)}% a year. Your bank sets the final rate; choose EMI in the payment window.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <form onSubmit={checkPin} className="mt-4 rounded-2xl bg-white p-4">
          <label htmlFor="pin" className="flex items-center gap-2 text-[15px] font-semibold text-spruce"><MapPin size={17} /> Delivery to</label>
          <div className="mt-2 flex gap-2">
            <input id="pin" inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="PIN code" value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinResult(null); }} className="field !min-h-[44px]" />
            <button className="btn btn-ghost btn-sm !min-h-[44px]">Check</button>
          </div>
          {pinResult && (
            <p className={`mt-2 text-[14.5px] ${pinResult.ok ? 'text-ink' : 'text-alert'}`} role="status">
              {pinResult.city && <span className="font-semibold">{pinResult.city}: </span>}{pinResult.text}
            </p>
          )}
        </form>

        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-[14.5px]">
          <li className="flex items-center gap-2"><ShieldCheck size={18} className="shrink-0 text-pass" />{POLICY.warrantyMonths}-month warranty</li>
          <li className="flex items-center gap-2"><RotateCcw size={18} className="shrink-0 text-pass" />{POLICY.returnDays}-day returns</li>
          <li className="flex items-center gap-2"><Truck size={18} className="shrink-0 text-pass" />Free delivery, insured</li>
          {POLICY.cod.enabled && <li className="flex items-center gap-2"><Banknote size={18} className="shrink-0 text-pass" />Pay on delivery</li>}
        </ul>

        <div className="mt-10 flex justify-center lg:hidden">
          <motion.div key={grade} initial={{ rotate: -5 }} animate={{ rotate: -1.5 }} transition={{ type: 'spring', stiffness: 180, damping: 9 }} className="origin-top">
            <ConditionTag grade={grade} sku={sku} hole="var(--color-bench)" className="[--tag-w:min(300px,80vw)]" />
          </motion.div>
        </div>
      </div>

      {/* Sticky bar on small screens once the main buttons scroll away */}
      <AnimatePresence>
        {showBar && !soldOut && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-[20px] bg-white/90 p-2.5 pl-4 shadow-[0_20px_50px_-20px_rgba(15,61,51,.55)] backdrop-blur-xl lg:hidden">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-mute">{p.model}, {GRADES[grade].label}</p>
              <p className="price text-[21px] leading-tight">{rupees(price)}</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => add(line())}>Add to cart</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Options({ title, options, value, onChange, note }: { title: string; options: UpgradeOption[]; value: number; onChange: (n: number) => void; note: string }) {
  return (
    <fieldset className="mt-7">
      <legend className="mb-3 text-[16px] font-semibold text-spruce">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.gb} className="chip has-[:checked]:border-spruce has-[:checked]:bg-spruce has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-tag-2">
            <input type="radio" name={title} className="sr-only" checked={value === o.gb} onChange={() => onChange(o.gb)} />
            {gb(o.gb)}{o.price ? <span className="opacity-75">+{rupees(o.price)}</span> : null}
          </label>
        ))}
      </div>
      <p className="hint">{note}</p>
    </fieldset>
  );
}
