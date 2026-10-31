'use client';

import { useState, useTransition } from 'react';
import { createCoupon, toggleCoupon } from '../actions';
import { toast } from '@/components/Toaster';

export default function CouponForm() {
  const [f, setF] = useState({ code: '', kind: 'flat' as 'flat' | 'percent', value: '', minSubtotal: '', maxDiscount: '', usageLimit: '', endsAt: '', note: '' });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const num = (s: string) => (s.trim() ? Number(s) : null);

  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        setError(null);
        const r = await createCoupon({ code: f.code, kind: f.kind, value: Number(f.value), minSubtotal: num(f.minSubtotal) ?? 0, maxDiscount: num(f.maxDiscount), usageLimit: num(f.usageLimit), endsAt: f.endsAt || null, note: f.note || null });
        if (!r.ok) { setError(r.error); return; }
        toast(`Coupon ${f.code.toUpperCase()} created`);
        setF({ ...f, code: '', value: '', note: '' });
      });
    }}>
      <div><label htmlFor="cc" className="label">Code</label><input id="cc" className="field uppercase" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="DIWALI1000" /></div>
      <div>
        <label htmlFor="ck" className="label">Type</label>
        <select id="ck" className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as 'flat' | 'percent' })}>
          <option value="flat">Fixed amount (₹)</option>
          <option value="percent">Percentage (%)</option>
        </select>
      </div>
      <div><label htmlFor="cv" className="label">{f.kind === 'flat' ? 'Amount off, ₹' : 'Percent off'}</label><input id="cv" className="field" inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
      <div><label htmlFor="cm" className="label">Minimum order, ₹ (optional)</label><input id="cm" className="field" inputMode="numeric" value={f.minSubtotal} onChange={(e) => setF({ ...f, minSubtotal: e.target.value })} /></div>
      {f.kind === 'percent' && <div><label htmlFor="cx" className="label">Largest discount, ₹ (optional)</label><input id="cx" className="field" inputMode="numeric" value={f.maxDiscount} onChange={(e) => setF({ ...f, maxDiscount: e.target.value })} /></div>}
      <div><label htmlFor="cu" className="label">Times it can be used (optional)</label><input id="cu" className="field" inputMode="numeric" value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: e.target.value })} /></div>
      <div><label htmlFor="ce" className="label">Last day (optional)</label><input id="ce" type="date" className="field" value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} /></div>
      <div className="sm:col-span-2"><label htmlFor="cn" className="label">Note for staff (optional)</label><input id="cn" className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      {error && <p className="error-text sm:col-span-2" role="alert">{error}</p>}
      <button className="btn btn-primary sm:col-span-2" disabled={pending || !f.code || !f.value}>{pending ? 'Creating…' : 'Create coupon'}</button>
    </form>
  );
}

export function CouponToggle({ code, active }: { code: string; active: boolean }) {
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  return (
    <button type="button" className={`btn btn-sm ${on ? 'btn-ghost' : 'btn-tag'}`} disabled={pending}
      onClick={() => start(async () => { await toggleCoupon(code, !on); setOn(!on); toast(on ? `${code} switched off` : `${code} switched on`); })}>
      {on ? 'Switch off' : 'Switch on'}
    </button>
  );
}
