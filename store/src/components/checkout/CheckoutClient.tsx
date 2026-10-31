'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BadgePercent, Banknote, Check, Lock, MapPin, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { useCart } from '../cart/CartContext';
import LoginFlow from '../auth/LoginFlow';
import ProductImage from '../ui/ProductImage';
import { getQuote, placeOrder, type AddressInput } from '@/app/(store)/checkout/actions';
import { usePayment } from './usePayment';
import { GRADES, STUDENT } from '@/lib/config';
import { formatPhone, gb, rupees } from '@/lib/format';
import { STATES, matchState } from '@/lib/india';
import { deliveryWindow, shortDate } from '@/lib/delivery';
import type { Totals } from '@/lib/pricing';
import type { TaxBreakdown } from '@/lib/tax';

type Saved = { id: number; name: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string };
type Viewer = { name: string | null; phone: string | null; email: string | null } | null;
type Q = { totals: Totals; tax: TaxBreakdown; student: boolean; couponValid: boolean | null; codAllowed: boolean; codMax: number };

const blankAddress = (v: Viewer): AddressInput => ({ name: v?.name ?? '', phone: v?.phone ?? '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: '' });

function Field({ id, label, err, children, className = '' }: { id: string; label: string; err?: string | null; children: React.ReactNode; className?: string }) {
  return <div className={className}><label htmlFor={id} className="label">{label}</label>{children}{err && <p className="error-text" id={`${id}-err`}>{err}</p>}</div>;
}

export default function CheckoutClient({ viewer, addresses, student, onlineReady }: {
  viewer: Viewer; addresses: Saved[]; student: 'approved' | 'pending' | 'rejected' | 'none'; onlineReady: boolean;
}) {
  const router = useRouter();
  const { cart, refresh } = useCart();
  const { pay, sheet } = usePayment();

  const [signIn, setSignIn] = useState(false);
  const [addressId, setAddressId] = useState<number | null>(addresses[0]?.id ?? null);
  const [addr, setAddr] = useState<AddressInput>(blankAddress(viewer));
  const [saveAddr, setSaveAddr] = useState(true);
  const [email, setEmail] = useState(viewer?.email ?? '');
  const [gstOpen, setGstOpen] = useState(false);
  const [gstin, setGstin] = useState('');
  const [method, setMethod] = useState<'online' | 'cod'>(onlineReady ? 'online' : 'cod');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [q, setQ] = useState<Q | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{ number: string; key: string | null } | null>(null);
  const [placing, startPlacing] = useTransition();
  const errRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!viewer) return;
    setEmail((e) => e || viewer.email || '');
    setAddr((a) => ({ ...a, name: a.name || viewer.name || '', phone: a.phone || viewer.phone || '' }));
  }, [viewer]);

  const chosen = addressId ? addresses.find((a) => a.id === addressId) : null;
  const state = chosen?.state ?? addr.state ?? null;
  const pin = chosen?.pincode ?? addr.pincode;
  const contactPhone = chosen?.phone ?? addr.phone;

  const requote = useCallback(async () => {
    const r = await getQuote({ coupon, cod: method === 'cod', state: state || null, email: email || null, phone: contactPhone || null });
    if (!r.ok) { setQuoteError(r.error); setQ(null); return; }
    setQuoteError(null);
    setQ({ totals: r.totals, tax: r.tax, student: r.student, couponValid: r.couponValid, codAllowed: r.codAllowed, codMax: r.codMax });
    if (method === 'cod' && !r.codAllowed && onlineReady) setMethod('online');
  }, [coupon, method, state, email, contactPhone, onlineReady]);

  useEffect(() => { void requote(); }, [requote, cart.subtotal, cart.count]);

  const lookupPin = async (p: string) => {
    try {
      const r = await fetch(`https://api.postalpincode.in/pincode/${p}`);
      const j = (await r.json()) as { Status: string; PostOffice?: { District: string; State: string }[] }[];
      const po = j?.[0]?.PostOffice?.[0];
      if (po) setAddr((a) => ({ ...a, city: a.city || po.District, state: a.state || matchState(po.State) || a.state }));
    } catch { /* the customer can type it */ }
  };

  const fieldErr = (f: string) => (error?.field === `address.${f}` || error?.field === f ? error.text : null);
  const win = pin && /^[1-9]\d{5}$/.test(pin) ? deliveryWindow(pin) : null;
  const ok = cart.lines.filter((l) => l.available);
  const bad = cart.lines.filter((l) => !l.available);

  const place = () => startPlacing(async () => {
    setError(null);
    if (pendingOrder) {
      const r = await pay(pendingOrder.number, pendingOrder.key);
      if (r.outcome === 'paid') router.push(`/orders/${pendingOrder.number}?placed=1${pendingOrder.key ? `&key=${pendingOrder.key}` : ''}`);
      else if (r.outcome === 'failed') setError({ text: r.error ?? 'The payment didn’t go through. Try again.' });
      return;
    }
    const res = await placeOrder({
      addressId: chosen ? chosen.id : null, address: chosen ? null : addr, saveAddress: saveAddr, email: email || null,
      method, coupon, gstin: gstOpen ? gstin || null : null, acceptTerms: terms as true,
    });
    if (!res.ok) {
      setError({ text: res.error, field: res.field });
      setTimeout(() => errRef.current?.focus(), 30);
      await refresh();
      return;
    }
    await refresh();
    const dest = `/orders/${res.number}?placed=1${res.key ? `&key=${res.key}` : ''}`;
    if (res.next === 'done') { router.push(dest); return; }
    setPendingOrder({ number: res.number, key: res.key });
    const r = await pay(res.number, res.key);
    if (r.outcome === 'paid') router.push(dest);
    else if (r.outcome === 'failed') setError({ text: r.error ?? 'The payment didn’t go through. Your laptop is held for 30 minutes; try again.' });
    else setError({ text: 'Payment window closed. Your order is saved and the laptop held for 30 minutes. Pay when you’re ready.' });
  });

  if (!cart.lines.length && !pendingOrder) {
    return (
      <div className="mt-10 rounded-card border border-dashed border-line-2 p-10 text-center">
        <p className="text-[18px] font-semibold">Your cart is empty</p>
        <Link href="/laptops" className="btn btn-primary mt-5">Shop laptops</Link>
      </div>
    );
  }

  const t = q?.totals;
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        {/* 1. Contact */}
        <section className="card p-6" aria-labelledby="c-h">
          <div className="flex items-center justify-between gap-3">
            <h2 id="c-h" className="text-[20px]"><span className="mono mr-2 text-[13px] text-mute">01</span>Contact</h2>
            {!viewer && !signIn && <button type="button" className="text-[14px] font-semibold underline" onClick={() => setSignIn(true)}>Sign in instead</button>}
          </div>
          {viewer ? (
            <p className="mt-3 text-[15px]">Signed in as <b>{viewer.name ?? viewer.email ?? formatPhone(viewer.phone ?? '')}</b>{viewer.email ? `, receipts to ${viewer.email}` : ''}.</p>
          ) : signIn ? (
            <div className="mt-4"><LoginFlow compact onDone={() => { setSignIn(false); router.refresh(); }} /><button type="button" className="mt-3 text-[14px] underline" onClick={() => setSignIn(false)}>Continue as a guest</button></div>
          ) : (
            <p className="mt-2 text-[14px] text-mute">Checking out as a guest. We’ll send the receipt and tracking link to your email; you can create an account afterwards.</p>
          )}
          {(!viewer || !viewer.email) && !signIn && (
            <Field id="email" label="Email for receipt and updates" err={fieldErr('email')} className="mt-4">
              <input id="email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldErr('email')} />
            </Field>
          )}
        </section>

        {/* 2. Delivery */}
        <section className="card p-6" aria-labelledby="d-h">
          <h2 id="d-h" className="text-[20px]"><span className="mono mr-2 text-[13px] text-mute">02</span>Delivery address</h2>
          {addresses.length > 0 && (
            <div className="mt-4 space-y-2" role="radiogroup" aria-label="Saved addresses">
              {addresses.map((a) => (
                <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${addressId === a.id ? 'border-ink ring-1 ring-ink' : 'border-line-2'}`}>
                  <input type="radio" name="addr" className="check mt-1" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  <span className="text-[14.5px]"><b>{a.name}</b>, {formatPhone(a.phone)}<br /><span className="text-mute">{a.line1}{a.line2 ? `, ${a.line2}` : ''}{a.landmark ? `, near ${a.landmark}` : ''}, {a.city}, {a.state} {a.pincode}</span></span>
                </label>
              ))}
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${addressId === null ? 'border-ink ring-1 ring-ink' : 'border-line-2'}`}>
                <input type="radio" name="addr" className="check" checked={addressId === null} onChange={() => setAddressId(null)} /><Plus size={16} aria-hidden="true" /> <span className="font-semibold">A new address</span>
              </label>
            </div>
          )}
          {addressId === null && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="a-name" label="Full name" err={fieldErr('name')}><input id="a-name" className="field" autoComplete="name" value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} /></Field>
              <Field id="a-phone" label="Mobile number" err={fieldErr('phone')}><input id="a-phone" className="field" inputMode="tel" autoComplete="tel-national" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} /></Field>
              <Field id="a-pin" label="PIN code" err={fieldErr('pincode')}><input id="a-pin" className="field" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={addr.pincode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setAddr({ ...addr, pincode: v }); if (v.length === 6) void lookupPin(v); }} /></Field>
              <Field id="a-city" label="City" err={fieldErr('city')}><input id="a-city" className="field" autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></Field>
              <Field id="a-line1" label="Flat, house number, street" err={fieldErr('line1')} className="sm:col-span-2"><input id="a-line1" className="field" autoComplete="address-line1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} /></Field>
              <Field id="a-line2" label="Area or locality (optional)"><input id="a-line2" className="field" autoComplete="address-line2" value={addr.line2 ?? ''} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} /></Field>
              <Field id="a-land" label="Landmark (optional)"><input id="a-land" className="field" value={addr.landmark ?? ''} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })} /></Field>
              <Field id="a-state" label="State" err={fieldErr('state')} className="sm:col-span-2">
                <select id="a-state" className="field" autoComplete="address-level1" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })}>
                  <option value="">Choose a state</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              {viewer && <label className="flex items-center gap-2 text-[14px] sm:col-span-2"><input type="checkbox" className="check" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /> Save this address to my account</label>}
            </div>
          )}
          {win && <p className="mt-4 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-[14px]"><MapPin size={16} aria-hidden="true" /> Estimated delivery <b>{shortDate(win.from)} – {shortDate(win.to)}</b></p>}
          <div className="mt-4">
            <button type="button" className="text-[14px] font-semibold underline" aria-expanded={gstOpen} onClick={() => setGstOpen((v) => !v)}>{gstOpen ? 'Remove GST details' : 'Buying for a business? Add your GSTIN'}</button>
            {gstOpen && <Field id="gstin" label="GSTIN" err={fieldErr('gstin')} className="mt-3 max-w-[320px]"><input id="gstin" className="field mono uppercase" maxLength={15} value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} /></Field>}
          </div>
        </section>

        {/* 3. Payment */}
        <section className="card p-6" aria-labelledby="p-h">
          <h2 id="p-h" className="text-[20px]"><span className="mono mr-2 text-[13px] text-mute">03</span>Payment</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
            <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${method === 'online' ? 'border-ink ring-1 ring-ink' : 'border-line-2'} ${onlineReady ? '' : 'opacity-50'}`}>
              <input type="radio" name="method" className="check mt-1" checked={method === 'online'} disabled={!onlineReady} onChange={() => setMethod('online')} />
              <span><b className="flex items-center gap-2"><Wallet size={17} aria-hidden="true" /> Pay online</b><span className="text-[13.5px] text-mute">UPI, cards, net banking, wallets, card EMI</span></span>
            </label>
            <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${method === 'cod' ? 'border-ink ring-1 ring-ink' : 'border-line-2'} ${q && !q.codAllowed ? 'opacity-50' : ''}`}>
              <input type="radio" name="method" className="check mt-1" checked={method === 'cod'} disabled={!!q && !q.codAllowed} onChange={() => setMethod('cod')} />
              <span><b className="flex items-center gap-2"><Banknote size={17} aria-hidden="true" /> Pay on delivery</b><span className="text-[13.5px] text-mute">{q && !q.codAllowed ? `Only for orders up to ${rupees(q.codMax)}` : 'Cash or UPI to the courier'}</span></span>
            </label>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[13px] text-mute"><Lock size={14} aria-hidden="true" /> Payments are processed by Razorpay. We never see or store card details.</p>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-[132px] lg:self-start">
        <div className="card p-6">
          <h2 className="text-[20px]">Order summary</h2>
          <ul className="mt-4 divide-y divide-line">
            {ok.map((l) => (
              <li key={l.itemId} className="flex gap-3 py-3">
                <span className="well h-[56px] w-[72px] shrink-0 rounded-lg border border-line p-1"><ProductImage image={l.image} art={l.art} brand={l.brand} slug={l.slug} title={l.title} sizes="72px" /></span>
                <span className="min-w-0 flex-1 text-[14px]">
                  <b className="block truncate">{l.title}</b>
                  <span className="text-[12.5px] text-mute">{GRADES[l.grade].label} · {gb(l.ramGb)} · {gb(l.ssdGb)}{l.warrantyMonths > 12 ? ` · ${l.warrantyMonths}-mo warranty` : ''}</span>
                  <span className="mono block text-[11.5px] text-faint">Unit {l.unitCode}</span>
                </span>
                <span className="price text-[15px]">{rupees(l.price ?? 0)}</span>
              </li>
            ))}
          </ul>
          {bad.length > 0 && <p className="mt-2 rounded-xl bg-bad-soft p-3 text-[13.5px] text-bad">{bad.length} {bad.length === 1 ? 'laptop in your cart is' : 'laptops in your cart are'} no longer available and won’t be ordered. <Link href="/cart" className="underline">Review cart</Link></p>}

          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim().toUpperCase() || null); }}>
            <label htmlFor="coupon" className="sr-only">Coupon code</label>
            <input id="coupon" className="field !min-h-10 uppercase" placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
            <button className="btn btn-ghost btn-sm !min-h-10">Apply</button>
          </form>
          {coupon && q?.couponValid === false && <p className="error-text">{q.totals.couponNote ?? 'That code isn’t valid.'} <button type="button" className="underline" onClick={() => { setCoupon(null); setCouponInput(''); }}>Remove</button></p>}

          {t && (
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[14.5px]">
              <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="num">{rupees(t.subtotal)}</dd></div>
              {t.studentDiscount > 0 && <div className="flex justify-between text-ok"><dt className="flex items-center gap-1.5"><BadgePercent size={15} aria-hidden="true" /> Student discount ({STUDENT.percent}%)</dt><dd className="num">−{rupees(t.studentDiscount)}</dd></div>}
              {t.couponDiscount > 0 && <div className="flex justify-between text-ok"><dt>Coupon {t.couponCode}</dt><dd className="num">−{rupees(t.couponDiscount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-mute">Delivery</dt><dd className="num">{t.shippingFee ? rupees(t.shippingFee) : 'Free'}</dd></div>
              {t.codFee > 0 && <div className="flex justify-between"><dt className="text-mute">Pay-on-delivery fee</dt><dd className="num">{rupees(t.codFee)}</dd></div>}
              <div className="flex items-baseline justify-between border-t border-line pt-3"><dt className="font-semibold">Total</dt><dd className="price text-[26px]">{rupees(t.total)}</dd></div>
              {q && q.tax.tax > 0 && <p className="text-right text-[12px] text-mute">Includes GST of {rupees(q.tax.tax)} ({q.tax.interState ? `IGST ${q.tax.rate}%` : `CGST + SGST ${q.tax.rate}%`})</p>}
              {q && q.tax.scheme === 'margin' && <p className="text-right text-[12px] text-mute">Prices include GST</p>}
              {t.couponNote && q?.couponValid !== false && <p className="text-[12.5px] text-mute">{t.couponNote}</p>}
            </dl>
          )}
          {!viewer && student === 'none' ? <p className="mt-3 text-[12.5px] text-mute">Student? <Link href="/students" className="underline">Verify</Link> and sign in for {STUDENT.percent}% off.</p> : null}
          {quoteError && <p className="error-text" role="alert">{quoteError}</p>}

          <label className="mt-5 flex items-start gap-2 text-[13.5px]">
            <input type="checkbox" className="check mt-0.5" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-invalid={error?.field === 'acceptTerms'} />
            <span>I agree to the <Link href="/terms" className="underline" target="_blank">terms of sale</Link> and <Link href="/returns" className="underline" target="_blank">return policy</Link>.</span>
          </label>
          <AnimatePresence>
            {error && <motion.p ref={errRef} tabIndex={-1} role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl bg-bad-soft p-3 text-[14px] text-bad">{error.text}</motion.p>}
          </AnimatePresence>
          <button type="button" className="btn btn-primary btn-lg mt-4 w-full" disabled={placing || !t || (!ok.length && !pendingOrder)} onClick={place}>
            {placing ? 'Working…' : pendingOrder ? `Pay ${t ? rupees(t.total) : ''}` : method === 'cod' ? 'Place order' : `Pay ${t ? rupees(t.total) : ''}`}
          </button>
          <ul className="mt-4 space-y-1.5 text-[12.5px] text-mute">
            <li className="flex gap-2"><ShieldCheck size={15} aria-hidden="true" /> Laptops are reserved for you when you place the order.</li>
            <li className="flex gap-2"><Check size={15} aria-hidden="true" /> Re-tested before dispatch. Cancel free until it ships.</li>
          </ul>
        </div>
      </aside>
      {sheet}
    </div>
  );
}
