'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createUnit, updateUnit, type UnitForm as F } from './actions';
import { GRADES, GRADE_ORDER } from '@/lib/config';
import { toast } from '@/components/Toaster';

export default function UnitForm({ code, initial, models, canCost, locked }: { code?: string; initial: F; models: { id: string; title: string; ramGb: number; ssdGb: number }[]; canCost: boolean; locked?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<F>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const num = (v: string) => (v === '' ? null : Number(v));
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));
  const field = (k: keyof F, label: string, opts: { type?: string; mono?: boolean; numeric?: boolean; placeholder?: string; span?: boolean } = {}) => (
    <div className={opts.span ? 'sm:col-span-2' : ''}>
      <label htmlFor={`u-${k}`} className="label">{label}</label>
      <input id={`u-${k}`} type={opts.type ?? 'text'} inputMode={opts.numeric ? 'decimal' : undefined} placeholder={opts.placeholder} className={`field ${opts.mono ? 'mono' : ''}`}
        value={(f[k] ?? '') as string | number} onChange={(e) => set(k, (opts.numeric ? num(e.target.value) : e.target.value) as F[typeof k])} />
    </div>
  );
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
      setErr(null);
      const r = code ? await updateUnit(code, f) : await createUnit(f);
      if (!r.ok) { setErr(r.error); return; }
      toast(r.message ?? 'Saved');
      if (!code && r.code) router.push(`/admin/inventory/${r.code}`); else router.refresh();
    }); }}>
      <div className="sm:col-span-2">
        <label htmlFor="u-product" className="label">Model</label>
        <select id="u-product" className="field" value={f.productId} disabled={!!code} onChange={(e) => { const m = models.find((x) => x.id === e.target.value); setF((x) => ({ ...x, productId: e.target.value, ramGb: m?.ramGb ?? x.ramGb, ssdGb: m?.ssdGb ?? x.ssdGb })); }}>
          <option value="">Choose a model</option>{models.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </div>
      {field('serialNumber', 'Serial number / service tag', { mono: true })}
      <div><label htmlFor="u-grade" className="label">Grade</label><select id="u-grade" className="field" value={f.grade} disabled={locked} onChange={(e) => set('grade', e.target.value as F['grade'])}>{GRADE_ORDER.map((g) => <option key={g} value={g}>{GRADES[g].label} (battery ≥ {GRADES[g].batteryMin}%)</option>)}</select></div>
      {field('ramGb', 'Memory installed (GB)', { numeric: true })}
      {field('ssdGb', 'SSD installed (GB)', { numeric: true })}
      {field('batteryHealth', 'Battery health % (measured)', { numeric: true })}
      {field('batteryCycles', 'Charge cycles', { numeric: true })}
      {field('ssdHealth', 'SSD health %', { numeric: true })}
      {field('colour', 'Colour', { placeholder: 'Black, Silver…' })}
      {field('keyboard', 'Keyboard', { placeholder: 'US English, backlit' })}
      {field('location', 'Location', { placeholder: 'Gurgaon · Rack A2' })}
      <div className="sm:col-span-2"><label htmlFor="u-cos" className="label">Cosmetic notes (customers see this)</label><textarea id="u-cos" className="field !min-h-[72px]" value={f.cosmeticNotes ?? ''} onChange={(e) => set('cosmeticNotes', e.target.value)} placeholder="Two hairline marks on the lid; palm rest like new." /></div>
      {field('price', 'Price override ₹ (blank = grade price)', { numeric: true })}
      {canCost && field('purchaseCost', 'Purchase cost ₹ (staff only)', { numeric: true })}
      {canCost && field('purchaseSource', 'Bought from')}
      {canCost && field('purchaseRef', 'Purchase invoice / lot ref', { mono: true })}
      {canCost && <div><label htmlFor="u-pd" className="label">Purchase date</label><input id="u-pd" type="date" className="field" value={f.purchasedAt ?? ''} onChange={(e) => set('purchasedAt', e.target.value || null)} /></div>}
      <div className="sm:col-span-2"><label htmlFor="u-int" className="label">Internal notes</label><textarea id="u-int" className="field !min-h-[72px]" value={f.internalNotes ?? ''} onChange={(e) => set('internalNotes', e.target.value)} /></div>
      {locked && <p className="text-[13px] text-mute sm:col-span-2">This unit is in an order, so its grade and price are locked.</p>}
      {err && <p className="error-text sm:col-span-2" role="alert">{err}</p>}
      <div className="sm:col-span-2"><button className="btn btn-primary" disabled={pending}>{pending ? 'Saving…' : code ? 'Save changes' : 'Add unit'}</button></div>
    </form>
  );
}
