'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveCoupon, toggleCoupon, type CouponForm as F } from './actions';
import { toast } from '@/components/Toaster';


export default function CouponForm({ initial, isNew, products, brands, onDone }: { initial: F; isNew: boolean; products: { id: string; title: string }[]; brands: string[]; onDone?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState<F>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));
  const num = (s: string) => (s === '' ? null : Number(s));
  const id = (k: string) => `c-${isNew ? 'new' : f.code}-${k}`;
  return (
    <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); start(async () => { setErr(null); const r = await saveCoupon(f, isNew); if (!r.ok) setErr(r.error); else { toast(isNew ? `Coupon ${f.code.toUpperCase()} created` : 'Saved'); if (isNew) setF(initial); onDone?.(); router.refresh(); } }); }}>
      <div><label htmlFor={id('code')} className="label">Code</label><input id={id('code')} className="field mono uppercase" disabled={!isNew} value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} /></div>
      <div><label htmlFor={id('kind')} className="label">Type</label><select id={id('kind')} className="field" value={f.kind} onChange={(e) => set('kind', e.target.value as F['kind'])}><option value="percent">Percent off</option><option value="flat">Fixed amount off</option></select></div>
      <div><label htmlFor={id('value')} className="label">{f.kind === 'percent' ? 'Percent' : 'Amount ₹'}</label><input id={id('value')} className="field mono" inputMode="decimal" value={f.value || ''} onChange={(e) => set('value', Number(e.target.value) || 0)} /></div>
      <div><label htmlFor={id('min')} className="label">Minimum order ₹</label><input id={id('min')} className="field mono" inputMode="numeric" value={f.minSubtotal || ''} onChange={(e) => set('minSubtotal', Number(e.target.value) || 0)} /></div>
      <div><label htmlFor={id('max')} className="label">Max discount ₹ (optional)</label><input id={id('max')} className="field mono" inputMode="numeric" value={f.maxDiscount ?? ''} onChange={(e) => set('maxDiscount', num(e.target.value))} /></div>
      <div><label htmlFor={id('lim')} className="label">Total uses (optional)</label><input id={id('lim')} className="field mono" inputMode="numeric" value={f.usageLimit ?? ''} onChange={(e) => set('usageLimit', num(e.target.value))} /></div>
      <div><label htmlFor={id('pul')} className="label">Uses per customer</label><input id={id('pul')} className="field mono" inputMode="numeric" value={f.perUserLimit ?? ''} onChange={(e) => set('perUserLimit', num(e.target.value))} /></div>
      <div><label htmlFor={id('s')} className="label">Starts (optional)</label><input id={id('s')} type="date" className="field" value={f.startsAt ?? ''} onChange={(e) => set('startsAt', e.target.value || null)} /></div>
      <div><label htmlFor={id('e')} className="label">Ends (optional)</label><input id={id('e')} type="date" className="field" value={f.endsAt ?? ''} onChange={(e) => set('endsAt', e.target.value || null)} /></div>
      <fieldset className="sm:col-span-3"><legend className="label">Only for brands (optional)</legend><div className="flex flex-wrap gap-2">{brands.map((b) => <button key={b} type="button" className="chip !min-h-8 !text-[13px]" aria-pressed={f.brands?.includes(b)} onClick={() => set('brands', f.brands?.includes(b) ? f.brands.filter((x) => x !== b) : [...(f.brands ?? []), b])}>{b}</button>)}</div></fieldset>
      <div className="sm:col-span-3"><label htmlFor={id('p')} className="label">Only for models (optional, hold Ctrl/⌘ to pick several)</label><select id={id('p')} multiple className="field !h-28 py-1" value={f.productIds} onChange={(e) => set('productIds', [...e.target.selectedOptions].map((o) => o.value))}>{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      <div className="sm:col-span-2"><label htmlFor={id('n')} className="label">Note (staff only)</label><input id={id('n')} className="field" value={f.note ?? ''} onChange={(e) => set('note', e.target.value || null)} placeholder="Diwali campaign" /></div>
      <div className="flex flex-col justify-end gap-2 text-[14px]">
        <label className="flex items-center gap-2"><input type="checkbox" className="check" checked={f.firstOrderOnly} onChange={(e) => set('firstOrderOnly', e.target.checked)} /> First order only</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="check" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
      </div>
      {err && <p className="error-text sm:col-span-3" role="alert">{err}</p>}
      <div className="sm:col-span-3"><button className="btn btn-primary btn-sm" disabled={pending}>{pending ? 'Saving…' : isNew ? 'Create coupon' : 'Save'}</button></div>
    </form>
  );
}

export function CouponToggle({ code, active }: { code: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const r = await toggleCoupon(code, !active); if (!r.ok) toast(r.error, 'error'); router.refresh(); })}>{active ? 'Pause' : 'Resume'}</button>;
}
