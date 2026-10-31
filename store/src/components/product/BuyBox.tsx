'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BadgeCheck, Battery, Check, HardDrive, MapPin, Minus, Plus, Share2, ShieldCheck, Truck } from 'lucide-react';
import { GRADES, GRADE_ORDER, POLICY, STUDENT, whatsappLink, type GradeKey } from '@/lib/config';
import type { PublicUnit } from '@/lib/inventory';
import type { UpgradeOption } from '@/lib/db/schema';
import { emiFrom, emiPerMonth, linePrice, savedPct, studentUnitDiscount, upgradeChoices } from '@/lib/pricing';
import { gb, rupees } from '@/lib/format';
import { useCart } from '../cart/CartContext';
import { toast } from '../Toaster';
import { checkPincode, type PinResult } from '@/app/laptops/[slug]/actions';
import NewsletterForm from '../NewsletterForm';
import AnimatedNumber from '../AnimatedNumber';

type P = { id: string; slug: string; title: string; brand: string; newPrice: number | null; ramOptions: UpgradeOption[]; ssdOptions: UpgradeOption[]; gradePrices: { grade: GradeKey; price: number }[] };

export default function BuyBox({ p, units, student, initialUnit }: { p: P; units: PublicUnit[]; student: 'approved' | 'none' | 'pending'; initialUnit?: string | null }) {
  const router = useRouter();
  const { add, has, busy } = useCart();
  const grades = GRADE_ORDER.filter((g) => units.some((u) => u.grade === g) || p.gradePrices.some((x) => x.grade === g));
  const start = units.find((u) => u.code === initialUnit) ?? units[0] ?? null;
  const [grade, setGrade] = useState<GradeKey>(start?.grade ?? grades[0] ?? 'excellent');
  const inGrade = units.filter((u) => u.grade === grade);
  const [unitId, setUnitId] = useState<string | null>(start?.id ?? null);
  const unit = inGrade.find((u) => u.id === unitId) ?? inGrade[0] ?? null;
  const [ram, setRam] = useState(unit?.ramGb ?? 0);
  const [ssd, setSsd] = useState(unit?.ssdGb ?? 0);
  const [warranty, setWarranty] = useState<number>(POLICY.warrantyMonths);
  const [qty, setQty] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [pin, setPin] = useState('');
  const [pinRes, setPinRes] = useState<PinResult | null>(null);
  const [pinPending, startPin] = useTransition();

  const ramChoices = unit ? upgradeChoices(p.ramOptions, unit.ramGb) : [];
  const ssdChoices = unit ? upgradeChoices(p.ssdOptions, unit.ssdGb) : [];
  const ramSel = ramChoices.some((c) => c.gb === ram) ? ram : unit?.ramGb ?? 0;
  const ssdSel = ssdChoices.some((c) => c.gb === ssd) ? ssd : unit?.ssdGb ?? 0;
  const price = unit ? linePrice(unit, p, { ramGb: ramSel, ssdGb: ssdSel, warrantyMonths: warranty }) ?? unit.price : null;
  const saved = price ? savedPct(price, p.newPrice) : null;
  const emi = price ? emiFrom(price) : null;
  const maxQty = Math.min(5, inGrade.length);
  const extra = useMemo(() => inGrade.filter((u) => u.id !== unit?.id).sort((a, b) => (b.batteryHealth ?? 0) - (a.batteryHealth ?? 0)), [inGrade, unit]);

  const pickGrade = (g: GradeKey) => {
    setGrade(g);
    const first = units.find((u) => u.grade === g) ?? null;
    setUnitId(first?.id ?? null);
    if (first) { setRam(first.ramGb); setSsd(first.ssdGb); }
    setQty(1);
    setShowAll(false);
  };
  const pickUnit = (u: PublicUnit) => { setUnitId(u.id); setRam(u.ramGb); setSsd(u.ssdGb); };

  const addAll = async (go: boolean) => {
    if (!unit) return;
    const picks = [unit, ...extra.slice(0, qty - 1)];
    for (const u of picks) {
      const sel = { ramGb: Math.max(ramSel, u.ramGb), ssdGb: Math.max(ssdSel, u.ssdGb), warrantyMonths: warranty };
      const r = await add(u.id, sel, { open: false });
      if (!r.ok) { toast(r.error ?? 'Could not add to cart', 'error'); router.refresh(); return; }
    }
    if (go) router.push('/checkout');
    else toast(picks.length > 1 ? `Added ${picks.length} units of ${p.title}` : `Added ${p.title} (${unit.code}) to your cart`);
  };

  const share = async () => {
    const url = `${location.origin}/laptops/${p.slug}${unit ? `?unit=${unit.code}` : ''}`;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else { await navigator.clipboard.writeText(url); toast('Link copied'); }
    } catch { /* cancelled */ }
  };

  const visible = showAll ? inGrade : inGrade.slice(0, 4);

  return (
    <div>
      {/* Price */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        {price != null ? (
          <>
            <span className="price text-[40px] leading-none"><AnimatedNumber value={price} format={(n) => rupees(n)} /></span>
            {p.newPrice ? <span className="pb-1 text-[14px] text-mute">New: <s className="num">{rupees(p.newPrice)}</s></span> : null}
            {saved ? <span className="pill pill-accent mb-1">Save {saved}%</span> : null}
          </>
        ) : (
          <span className="price text-[32px] leading-none text-mute">Sold out</span>
        )}
      </div>
      {price != null && (
        <p className="mt-2 text-[14px] text-mute">
          Inclusive of GST{emi ? <> · EMI from <b className="text-ink">{rupees(emi)}/month</b></> : null}
          {student === 'approved' ? <> · <b className="text-ok">Your student price {rupees(price - studentUnitDiscount(price))}</b></> : <> · <Link href="/students" className="link">{STUDENT.percent}% off for students</Link></>}
        </p>
      )}

      {/* Grade */}
      <fieldset className="mt-7">
        <legend className="flex w-full items-baseline justify-between text-[14px] font-semibold">Condition <Link href="/how-we-test#grades" className="text-[13px] font-normal text-mute underline">What grades mean</Link></legend>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {grades.map((g) => {
            const n = units.filter((u) => u.grade === g);
            const from = n.length ? Math.min(...n.map((u) => u.price)) : p.gradePrices.find((x) => x.grade === g)?.price;
            const on = g === grade;
            return (
              <button key={g} type="button" onClick={() => pickGrade(g)} aria-pressed={on}
                className={`rounded-xl border p-3 text-left transition ${on ? 'border-ink bg-ink text-white' : 'border-line-2 bg-white hover:border-ink'} ${n.length ? '' : 'opacity-60'}`}>
                <span className="block text-[14.5px] font-semibold">{GRADES[g].label}</span>
                <span className={`block text-[12px] ${on ? 'text-white/70' : 'text-mute'}`}>{n.length ? `${n.length} from ${rupees(from ?? 0)}` : 'None in stock'}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[13px] text-mute">{GRADES[grade].body} Battery at least {GRADES[grade].batteryMin}%.</p>
      </fieldset>

      {/* Units */}
      {inGrade.length > 0 ? (
        <fieldset className="mt-6">
          <legend className="text-[14px] font-semibold">Choose your unit <span className="font-normal text-mute">({inGrade.length} available)</span></legend>
          <ul className="mt-2.5 space-y-2">
            {visible.map((u) => {
              const on = u.id === unit?.id;
              const inCart = has(u.id);
              return (
                <li key={u.id}>
                  <label className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${on ? 'border-ink ring-1 ring-ink' : 'border-line-2 hover:border-ink'}`}>
                    <input type="radio" name="unit" className="check mt-1" checked={on} onChange={() => pickUnit(u)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="mono text-[12.5px] font-medium">Unit {u.code}</span>
                        <span className="price text-[16px]">{rupees(u.price)}</span>
                      </span>
                      <span className="mt-2 grid grid-cols-3 gap-2 text-[12.5px]">
                        <span className="flex items-center gap-1.5"><Battery size={14} aria-hidden="true" /><span><b className="mono">{u.batteryHealth ?? '—'}%</b> <span className="text-mute">battery</span></span></span>
                        <span className="flex items-center gap-1.5"><HardDrive size={14} aria-hidden="true" /><span><b className="mono">{u.ssdHealth ?? '—'}%</b> <span className="text-mute">SSD</span></span></span>
                        <span className="text-mute">{gb(u.ramGb)} · {gb(u.ssdGb)}</span>
                      </span>
                      {u.cosmeticNotes && <span className="mt-1.5 block text-[13px] text-ink-2">{u.cosmeticNotes}</span>}
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mute">
                        {u.colour && <span>{u.colour}</span>}
                        {u.keyboard && <span>{u.keyboard}</span>}
                        {u.batteryCycles != null && <span>{u.batteryCycles} cycles</span>}
                        <Link href={`/units/${u.code}`} className="font-semibold text-ink underline" onClick={(e) => e.stopPropagation()}>Inspection report</Link>
                        {inCart && <span className="pill pill-ok !h-5">In your cart</span>}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {inGrade.length > 4 && <button type="button" className="mt-2 text-[13.5px] font-semibold underline" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show all ${inGrade.length} units`}</button>}
        </fieldset>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-line-2 p-4">
          <p className="font-semibold">No {GRADES[grade].label.toLowerCase()} units right now</p>
          <p className="mt-1 text-[14px] text-mute">{units.length ? 'Try another grade, or ' : ''}get an email when new units of this model are listed.</p>
          <div className="mt-3"><NewsletterForm tone="light" source={`restock:${p.slug}`} /></div>
        </div>
      )}

      {unit && (
        <>
          {/* Configuration */}
          {(ramChoices.length > 1 || ssdChoices.length > 1) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {ramChoices.length > 1 && (
                <div>
                  <label htmlFor="ram" className="label">Memory</label>
                  <select id="ram" className="field" value={ramSel} onChange={(e) => setRam(Number(e.target.value))}>
                    {ramChoices.map((c) => <option key={c.gb} value={c.gb}>{gb(c.gb)}{c.extra ? ` (+${rupees(c.extra)})` : ' (as is)'}</option>)}
                  </select>
                </div>
              )}
              {ssdChoices.length > 1 && (
                <div>
                  <label htmlFor="ssd" className="label">Storage</label>
                  <select id="ssd" className="field" value={ssdSel} onChange={(e) => setSsd(Number(e.target.value))}>
                    {ssdChoices.map((c) => <option key={c.gb} value={c.gb}>{gb(c.gb)} SSD{c.extra ? ` (+${rupees(c.extra)})` : ' (as is)'}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          <fieldset className="mt-5">
            <legend className="text-[14px] font-semibold">Warranty</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {POLICY.warrantyExtensions.map((w) => (
                <label key={w.months} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-[13.5px] ${warranty === w.months ? 'border-ink ring-1 ring-ink' : 'border-line-2 hover:border-ink'}`}>
                  <input type="radio" name="warranty" className="check mt-0.5" checked={warranty === w.months} onChange={() => setWarranty(w.months)} />
                  <span><b className="block">{w.months} months</b><span className="text-mute">{w.price ? `+${rupees(w.price)}` : 'Included'}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-[54px] items-center rounded-[14px] border border-line-2" role="group" aria-label="Quantity">
              <button type="button" className="grid h-full w-11 place-items-center disabled:opacity-30" aria-label="One fewer" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}><Minus size={16} /></button>
              <span className="mono w-6 text-center" aria-live="polite">{qty}</span>
              <button type="button" className="grid h-full w-11 place-items-center disabled:opacity-30" aria-label="One more" disabled={qty >= maxQty} onClick={() => setQty((q) => q + 1)}><Plus size={16} /></button>
            </div>
            <button type="button" className="btn btn-primary btn-lg flex-1" disabled={busy} onClick={() => addAll(false)}>{busy ? 'Adding…' : 'Add to cart'}</button>
          </div>
          {qty > 1 && <p className="mt-2 text-[12.5px] text-mute">Adds this unit and the {qty - 1} other {GRADES[grade].label.toLowerCase()} {qty - 1 === 1 ? 'unit' : 'units'} with the best batteries.</p>}
          <button type="button" className="btn btn-accent btn-lg mt-3 w-full" disabled={busy} onClick={() => addAll(true)}>Buy now</button>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={share}><Share2 size={15} /> Share</button>
            <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener" href={whatsappLink(`Hi, I have a question about ${p.title}, unit ${unit.code}.`)}>Ask on WhatsApp</a>
          </div>
          {price != null && price >= POLICY.emi.minOrder && (
            <details className="mt-4 rounded-xl border border-line px-4 py-3 text-[14px]">
              <summary className="cursor-pointer font-semibold">EMI options</summary>
              <table className="mt-2 w-full text-[13.5px]">
                <thead><tr className="text-left text-mute"><th className="py-1 font-normal">Months</th><th className="py-1 font-normal">Per month</th><th className="py-1 text-right font-normal">Total</th></tr></thead>
                <tbody>{POLICY.emi.tenures.map((m) => { const pm = emiPerMonth(price, m); return <tr key={m} className="border-t border-line"><td className="py-1.5">{m}</td><td className="mono">{rupees(pm)}</td><td className="mono text-right">{rupees(pm * m)}</td></tr>; })}</tbody>
              </table>
              <p className="mt-2 text-[12px] text-mute">Card EMI estimate at {POLICY.emi.annualRate * 100}% a year; your bank sets the final rate. Chosen in Razorpay at payment.</p>
            </details>
          )}
        </>
      )}

      {/* Delivery */}
      <form className="mt-6 rounded-xl bg-canvas p-4" onSubmit={(e) => { e.preventDefault(); startPin(async () => setPinRes(await checkPincode(pin))); }}>
        <label htmlFor="pin" className="flex items-center gap-2 text-[14px] font-semibold"><MapPin size={16} aria-hidden="true" /> Check delivery</label>
        <div className="mt-2 flex gap-2">
          <input id="pin" inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="PIN code" className="field !min-h-10 bg-white" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button className="btn btn-ghost btn-sm !min-h-10" disabled={pinPending}>{pinPending ? '…' : 'Check'}</button>
        </div>
        <AnimatePresence>
          {pinRes && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="status" className={`mt-2 text-[13.5px] ${pinRes.ok ? 'text-ink' : 'text-bad'}`}>
              {pinRes.ok ? <><Truck size={14} className="mr-1 inline" aria-hidden="true" />Delivered <b>{pinRes.window}</b>{pinRes.free ? ', free' : ''}.{pinRes.cod ? ' Pay on delivery available.' : ''}</> : pinRes.error}
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      <ul className="mt-5 space-y-2 text-[13.5px] text-ink-2">
        <li className="flex gap-2"><ShieldCheck size={17} className="shrink-0" aria-hidden="true" /> {POLICY.warrantyMonths}-month warranty, repair or replace</li>
        <li className="flex gap-2"><Check size={17} className="shrink-0" aria-hidden="true" /> {POLICY.returnDays}-day returns with free pickup</li>
        <li className="flex gap-2"><BadgeCheck size={17} className="shrink-0" aria-hidden="true" /> Re-tested after you order, before it ships</li>
      </ul>

      {/* Sticky bar on phones */}
      {unit && price != null && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="truncate text-[12px] text-mute">{GRADES[grade].label} · {unit.code}</p><p className="price text-[20px] leading-tight">{rupees(price)}</p></div>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => addAll(false)}>Add to cart</button>
          </div>
        </div>
      )}
    </div>
  );
}
