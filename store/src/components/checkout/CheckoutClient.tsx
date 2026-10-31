'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BadgePercent, Banknote, Check, Lock, MapPin, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { useCart } from '../cart/CartContext';
import LoginFlow from '../auth/LoginFlow';
import LaptopArt from '../LaptopArt';
import { getQuote, placeOrder, type AddressInput } from '@/app/checkout/actions';
import { usePayment } from './usePayment';
import { GRADES, POLICY, STUDENT } from '@/lib/config';
import { formatPhone, gb, rupees } from '@/lib/format';
import { STATES, matchState } from '@/lib/india';
import { deliveryWindow, shortDate } from '@/lib/delivery';
import type { Totals } from '@/lib/pricing';

type Saved = { id: number; name: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string };
type Viewer = { name: string | null; phone: string | null; email: string | null } | null;

const blankAddress = (v: Viewer): AddressInput => ({ name: v?.name ?? '', phone: v?.phone ?? '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: '' });

export default function CheckoutClient({ viewer, addresses, student, onlineReady, codMax }: {
  viewer: Viewer; addresses: Saved[]; student: 'approved' | 'pending' | 'rejected' | 'none'; onlineReady: boolean; codMax: number;
}) {
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const { pay, sheet } = usePayment();

  const [addressId, setAddressId] = useState<number | null>(addresses[0]?.id ?? null);
  const [addr, setAddr] = useState<AddressInput>(blankAddress(viewer));
  const [saveAddr, setSaveAddr] = useState(true);
  const [email, setEmail] = useState(viewer?.email ?? '');
  const [gstOpen, setGstOpen] = useState(false);
  const [gstin, setGstin] = useState('');
  const [method, setMethod] = useState<'online' | 'cod'>(onlineReady ? 'online' : 'cod');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [q, setQ] = useState<{ totals: Totals; student: boolean; couponValid: boolean | null } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  const [placing, startPlacing] = useTransition();
  const [, startQuote] = useTransition();
  const errRef = useRef<HTMLParagraphElement>(null);
  const payRef = useRef<HTMLButtonElement>(null);
  const [payVisible, setPayVisible] = useState(true);

  // Signing in happens on this page; fill in what the account already knows.
  useEffect(() => {
    if (!viewer) return;
    setEmail((e) => e || viewer.email || '');
    setAddr((a) => ({ ...a, name: a.name || viewer.name || '', phone: a.phone || viewer.phone || '' }));
  }, [viewer]);

  const cartInput = useMemo(() => lines.map((l) => ({ productId: l.productId, grade: l.grade, ramGb: l.ramGb, ssdGb: l.ssdGb, warrantyMonths: l.warrantyMonths, qty: l.qty })), [lines]);

  useEffect(() => {
    if (!ready || !lines.length) return;
    startQuote(async () => {
      const r = await getQuote(cartInput, coupon, method === 'cod');
      if (!r.ok) { setQuoteError(r.error); setQ(null); return; }
      setQuoteError(null);
      setQ({ totals: r.totals, student: r.student, couponValid: r.couponValid });
    });
  }, [cartInput, coupon, method, ready, lines.length]);

  useEffect(() => {
    const el = payRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPayVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ready, lines.length]);

  const subtotalPreview = lines.reduce((n, l) => n + l.unit * l.qty, 0);
  const total = q?.totals.total ?? subtotalPreview;
  const codAllowed = codMax > 0 && total <= codMax;
  useEffect(() => { if (method === 'cod' && !codAllowed && onlineReady) setMethod('online'); }, [codAllowed, method, onlineReady]);

  const pinForEstimate = addressId ? addresses.find((a) => a.id === addressId)?.pincode : addr.pincode;
  const window_ = pinForEstimate ? deliveryWindow(pinForEstimate) : null;

  async function lookupPin(pin: string) {
    if (!/^[1-9]\d{5}$/.test(pin)) return;
    try {
      const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const d = (await r.json()) as { PostOffice?: { District: string; State: string }[] }[];
      const po = d?.[0]?.PostOffice?.[0];
      if (po) setAddr((a) => ({ ...a, city: a.city || po.District, state: a.state || matchState(po.State) || a.state }));
    } catch { /* typing it in still works */ }
  }

  async function runPayment(number: string) {
    const res = await pay(number);
    if (res.outcome === 'paid') {
      clear();
      router.push(`/orders/${number}?placed=1`);
      return;
    }
    setPendingOrder(number);
    setError({ text: res.outcome === 'dismissed' ? 'Payment wasn’t completed. Your order is held for 30 minutes; pay now to confirm it.' : res.error ?? 'The payment didn’t go through. Try again or choose another method.' });
  }

  function submit() {
    setError(null);
    startPlacing(async () => {
      if (pendingOrder) { await runPayment(pendingOrder); return; }
      const res = await placeOrder({
        lines: cartInput, addressId, address: addressId ? null : addr, saveAddress: saveAddr,
        email: email || null, method, coupon, gstin: gstOpen && gstin ? gstin : null,
      });
      if (!res.ok) {
        setError({ text: res.error, field: res.field });
        requestAnimationFrame(() => errRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
        return;
      }
      if (res.next === 'done') {
        clear();
        router.push(`/orders/${res.number}?placed=1`);
        return;
      }
      await runPayment(res.number);
    });
  }

  if (!ready) return <div className="mt-10 h-64 animate-pulse rounded-[28px] bg-white/60" />;

  if (!lines.length && !pendingOrder) {
    return (
      <div className="sheet mt-8 max-w-[640px] p-8 md:p-10">
        <p className="text-[20px] font-semibold text-spruce">Your cart is empty.</p>
        <p className="mt-2 text-mute">Pick a laptop first; checkout takes about a minute after that.</p>
        <Link href="/laptops" className="btn btn-primary mt-6">Browse laptops</Link>
      </div>
    );
  }

  const fieldErr = (f: string) => (error?.field === `address.${f}` ? error.text : null);
  const t = q?.totals;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-5">
        {/* 1. Account */}
        <Section n={1} title={viewer ? 'Your details' : 'Sign in to continue'} done={!!viewer}>
          {viewer ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label">Signed in as</p>
                <p className="text-[16px]">{viewer.name ? `${viewer.name}, ` : ''}{viewer.phone ? formatPhone(viewer.phone) : viewer.email}</p>
              </div>
              <div>
                <label htmlFor="email" className="label">Email for receipts and updates</label>
                <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-invalid={error?.field === 'email'} />
                {error?.field === 'email' && <p className="error-text">{error.text}</p>}
              </div>
            </div>
          ) : (
            <LoginFlow compact onDone={() => router.refresh()} />
          )}
        </Section>

        {/* 2. Address */}
        <Section n={2} title="Delivery address" disabled={!viewer}>
          {viewer && (
            <>
              {addresses.length > 0 && (
                <div className="grid gap-2">
                  {addresses.map((a) => (
                    <label key={a.id} className="flex cursor-pointer gap-3 rounded-2xl border-[1.5px] border-line bg-white p-4 has-[:checked]:border-spruce has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-tag-2">
                      <input type="radio" name="addr" className="mt-1 accent-[var(--color-spruce)]" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <span className="text-[15px] leading-relaxed">
                        <span className="font-semibold text-spruce">{a.name}</span>, {formatPhone(a.phone)}<br />
                        {a.line1}{a.line2 ? `, ${a.line2}` : ''}{a.landmark ? `, near ${a.landmark}` : ''}, {a.city}, {a.state} {a.pincode}
                      </span>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-line bg-white p-4 has-[:checked]:border-spruce">
                    <input type="radio" name="addr" className="accent-[var(--color-spruce)]" checked={addressId === null} onChange={() => setAddressId(null)} />
                    <span className="flex items-center gap-2 font-semibold text-spruce"><Plus size={17} /> Deliver somewhere else</span>
                  </label>
                </div>
              )}
              <AnimatePresence initial={false}>
                {addressId === null && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className={`grid gap-4 sm:grid-cols-2 ${addresses.length ? 'pt-4' : ''}`}>
                      <Field id="a-name" label="Full name" err={fieldErr('name')}><input id="a-name" className="field" autoComplete="name" value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} /></Field>
                      <Field id="a-phone" label="Mobile number" err={fieldErr('phone')}><input id="a-phone" className="field" inputMode="tel" autoComplete="tel-national" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} /></Field>
                      <Field id="a-pin" label="PIN code" err={fieldErr('pincode')}><input id="a-pin" className="field" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={addr.pincode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setAddr({ ...addr, pincode: v }); if (v.length === 6) lookupPin(v); }} /></Field>
                      <Field id="a-city" label="City" err={fieldErr('city')}><input id="a-city" className="field" autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></Field>
                      <div className="sm:col-span-2"><Field id="a-l1" label="House, flat, street" err={fieldErr('line1')}><input id="a-l1" className="field" autoComplete="address-line1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} /></Field></div>
                      <Field id="a-l2" label="Area or locality (optional)"><input id="a-l2" className="field" autoComplete="address-line2" value={addr.line2 ?? ''} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} /></Field>
                      <Field id="a-lm" label="Landmark (optional)"><input id="a-lm" className="field" value={addr.landmark ?? ''} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })} /></Field>
                      <Field id="a-state" label="State" err={fieldErr('state')}>
                        <select id="a-state" className="field" autoComplete="address-level1" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })}>
                          <option value="">Choose a state</option>
                          {STATES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </Field>
                      <label className="flex items-center gap-2 self-end pb-3 text-[15px]"><input type="checkbox" className="h-[18px] w-[18px] accent-[var(--color-spruce)]" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} />Save for next time</label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-4">
                {!gstOpen ? (
                  <button type="button" className="link text-[14.5px]" onClick={() => setGstOpen(true)}>Need a GST invoice? Add your GSTIN</button>
                ) : (
                  <Field id="gstin" label="GSTIN (for a business invoice)" err={error?.field === 'gstin' ? error.text : null}>
                    <input id="gstin" className="field uppercase" maxLength={15} value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="06ABCDE1234F1Z5" />
                  </Field>
                )}
              </div>
            </>
          )}
        </Section>

        {/* 3. Payment */}
        <Section n={3} title="Payment" disabled={!viewer}>
          {viewer && (
            <div className="grid gap-2">
              <PayOption checked={method === 'online'} disabled={!onlineReady} onChange={() => setMethod('online')} icon={<Wallet size={20} />} title="Pay online" body={onlineReady ? 'UPI, cards, net banking, wallets and card EMI, through Razorpay.' : 'Not switched on yet.'} />
              {codMax > 0 && (
                <PayOption checked={method === 'cod'} disabled={!codAllowed} onChange={() => setMethod('cod')} icon={<Banknote size={20} />} title="Pay on delivery"
                  body={codAllowed ? `Cash or UPI to the courier when it arrives.${POLICY.cod.fee ? ` ${rupees(POLICY.cod.fee)} handling fee.` : ''}` : `For orders up to ${rupees(codMax)}.`} />
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24" aria-label="Order summary">
        <div className="sheet p-5 md:p-7">
          <h2 className="text-[24px]">Order summary</h2>
          <ul className="mt-4 divide-y divide-line">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3 py-3">
                <div className="w-[76px] shrink-0 rounded-xl bg-bench p-1.5"><LaptopArt art={l.art} brand={l.brand} slug={l.slug} flat /></div>
                <div className="min-w-0 flex-1 text-[14.5px]">
                  <p className="font-semibold leading-snug text-spruce">{l.qty > 1 ? `${l.qty} × ` : ''}{l.title}</p>
                  <p className="text-mute">{GRADES[l.grade].label}, {gb(l.ramGb)}, {gb(l.ssdGb)}{l.warrantyMonths > 12 ? `, ${l.warrantyMonths / 12}-yr warranty` : ''}</p>
                </div>
                <p className="price shrink-0 text-[17px]">{rupees(l.unit * l.qty)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-line pt-4">
            {coupon && q?.couponValid ? (
              <p className="flex items-center justify-between text-[14.5px]"><span className="flex items-center gap-2 text-pass"><Check size={16} /> Code {coupon} applied</span><button type="button" className="link" onClick={() => { setCoupon(null); setCouponInput(''); }}>Remove</button></p>
            ) : (
              <div className="flex gap-2">
                <label htmlFor="coupon" className="sr-only">Coupon code</label>
                <input id="coupon" className="field !min-h-[44px] uppercase placeholder:normal-case" placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
                <button type="button" className="btn btn-ghost btn-sm !min-h-[44px]" onClick={() => setCoupon(couponInput.trim() || null)} disabled={!couponInput.trim()}>Apply</button>
              </div>
            )}
            {coupon && q?.couponValid === false && <p className="error-text">That code isn’t valid or has expired.</p>}
            {t?.couponNote && <p className="hint">{t.couponNote}</p>}
          </div>

          <dl className="mt-4 space-y-2 text-[15px]">
            <Row k="Subtotal" v={rupees(t?.subtotal ?? subtotalPreview)} />
            {!!t?.studentDiscount && <Row k={`Student discount (${STUDENT.percent}%)`} v={`−${rupees(t.studentDiscount)}`} good />}
            {!!t?.couponDiscount && <Row k={`Coupon ${t.couponCode}`} v={`−${rupees(t.couponDiscount)}`} good />}
            <Row k="Delivery" v={t?.shippingFee ? rupees(t.shippingFee) : 'Free'} />
            {!!t?.codFee && <Row k="Pay on delivery fee" v={rupees(t.codFee)} />}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold text-spruce">Total</dt>
              <dd className="price text-[30px]">{rupees(total)}</dd>
            </div>
          </dl>

          {student !== 'approved' && (
            <p className="mt-4 flex gap-2 rounded-2xl bg-tag-soft px-4 py-3 text-[14px]">
              <BadgePercent size={18} className="mt-0.5 shrink-0 text-spruce" />
              {student === 'pending'
                ? 'Your student ID is being checked. Once approved, the discount applies to new orders.'
                : <span>Student? <Link href="/students" className="link font-semibold">Verify your ID</Link> to take {STUDENT.percent}% off this order.</span>}
            </p>
          )}

          {quoteError && <p className="error-text mt-4" role="alert">{quoteError}</p>}
          {error && !error.field?.startsWith('address') && error.field !== 'email' && error.field !== 'gstin' && (
            <p ref={errRef} className="mt-4 rounded-2xl bg-alert-soft px-4 py-3 text-[14.5px] text-alert" role="alert">{error.text}</p>
          )}
          {error && (error.field?.startsWith('address') || error.field === 'email' || error.field === 'gstin') && (
            <p ref={errRef} className="mt-4 text-[14.5px] text-alert" role="alert">Check the highlighted field: {error.text}</p>
          )}

          <button ref={payRef} type="button" onClick={submit} className="btn btn-primary btn-lg mt-5 w-full" disabled={!viewer || placing || !!quoteError}>
            <Lock size={17} /> {placing ? 'Working…' : pendingOrder ? `Pay ${rupees(total)}` : method === 'cod' ? 'Place order' : `Pay ${rupees(total)}`}
          </button>
          {window_ && <p className="mt-3 flex items-center gap-2 text-[14px] text-mute"><MapPin size={15} /> Arrives {shortDate(window_.from)} to {shortDate(window_.to)}</p>}
          <p className="mt-2 flex items-center gap-2 text-[14px] text-mute"><ShieldCheck size={15} /> {POLICY.warrantyMonths}-month warranty and {POLICY.returnDays}-day returns</p>
        </div>
      </aside>
      {viewer && !payVisible && (
        <div className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-[20px] bg-white/90 p-2.5 pl-4 shadow-[0_20px_50px_-20px_rgba(15,61,51,.55)] backdrop-blur-xl lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-mute">Total{t?.studentDiscount ? ', student price' : ''}</p>
            <p className="price text-[21px] leading-tight">{rupees(total)}</p>
          </div>
          <button type="button" onClick={submit} className="btn btn-primary" disabled={placing || !!quoteError}>
            <Lock size={16} /> {placing ? 'Working…' : method === 'cod' ? 'Place order' : 'Pay'}
          </button>
        </div>
      )}
      {sheet}
    </div>
  );
}

function Section({ n, title, children, done, disabled }: { n: number; title: string; children: React.ReactNode; done?: boolean; disabled?: boolean }) {
  return (
    <section className={`sheet p-5 md:p-7 ${disabled ? 'opacity-55' : ''}`} aria-labelledby={`sec-${n}`}>
      <h2 id={`sec-${n}`} className="flex items-center gap-3 text-[22px]">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] ${done ? 'bg-pass text-white' : 'bg-spruce text-white'}`} aria-hidden>{done ? <Check size={16} strokeWidth={3} /> : n}</span>
        {title}
      </h2>
      {!disabled && <div className="mt-5">{children}</div>}
    </section>
  );
}

function Field({ id, label, err, children }: { id: string; label: string; err?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className={err ? '[&_.field]:!border-alert' : ''}>{children}</div>
      {err && <p className="error-text" id={`${id}-err`}>{err}</p>}
    </div>
  );
}

function PayOption({ checked, disabled, onChange, icon, title, body }: { checked: boolean; disabled?: boolean; onChange: () => void; icon: React.ReactNode; title: string; body: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-line bg-white p-4 has-[:checked]:border-spruce has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-tag-2 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <input type="radio" name="method" className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${checked ? 'bg-spruce text-white' : 'bg-bench text-spruce'}`}>{icon}</span>
      <span className="flex-1">
        <span className="block font-semibold text-spruce">{title}</span>
        <span className="block text-[14px] text-mute">{body}</span>
      </span>
      <span className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${checked ? 'border-spruce bg-spruce text-white' : 'border-line'}`} aria-hidden>{checked && <Check size={12} strokeWidth={3} />}</span>
    </label>
  );
}

function Row({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-mute">{k}</dt>
      <dd className={good ? 'font-semibold text-pass' : 'text-ink'}>{v}</dd>
    </div>
  );
}
