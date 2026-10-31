'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { saveModelPrices } from './actions';
import { toast } from '@/components/Toaster';
import { GRADES, type GradeKey } from '@/lib/config';

type V = { id: number; grade: string; price: number; stock: number; active: boolean };
// stock here is the number of units on sale in that grade (read-only).
type P = { id: string; title: string; slug: string; cpuShort: string; active: boolean; featured: boolean; newPrice: number | null };

const toRupees = (p: number) => String(Math.round(p / 100));

export default function ProductRow({ p, variants }: { p: P; variants: V[] }) {
  const [active, setActive] = useState(p.active);
  const [featured, setFeatured] = useState(p.featured);
  const [newPrice, setNewPrice] = useState(p.newPrice ? toRupees(p.newPrice) : '');
  const [vs, setVs] = useState(variants.map((v) => ({ ...v, priceText: toRupees(v.price), stockText: String(v.stock) })));
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const edit = (id: number, patch: Partial<(typeof vs)[number]>) => { setVs((s) => s.map((v) => (v.id === id ? { ...v, ...patch } : v))); setDirty(true); };

  const save = () => start(async () => {
    const r = await saveModelPrices({
      id: p.id, active, featured, newPrice: newPrice ? Math.round(Number(newPrice) * 100) : null,
      grades: vs.map((v) => ({ grade: v.grade, price: Math.round(Number(v.priceText) * 100), active: v.active })),
    });
    if (!r.ok) { toast(r.error, 'error'); return; }
    toast(`${p.title} saved`);
    setDirty(false);
  });

  return (
    <li className={`rounded-card border border-line bg-white p-5 ${active ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/products/${p.id}`} className="font-semibold text-ink hover:underline">{p.title}</Link>
          <span className="ml-2 text-[13.5px] text-mute">{p.cpuShort}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[14px]">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--color-ink)]" checked={active} onChange={(e) => { setActive(e.target.checked); setDirty(true); }} />On sale</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--color-ink)]" checked={featured} onChange={(e) => { setFeatured(e.target.checked); setDirty(true); }} />Featured</label>
          <label className="flex items-center gap-2">New price ₹<input className="field !min-h-[36px] !w-[110px] !px-2" inputMode="numeric" value={newPrice} onChange={(e) => { setNewPrice(e.target.value.replace(/\D/g, '')); setDirty(true); }} aria-label={`${p.title} approximate new price in rupees`} /></label>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {vs.map((v) => (
          <div key={v.id} className={`rounded-2xl p-3 ${v.active ? 'bg-canvas' : 'bg-canvas/50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink">{GRADES[v.grade as GradeKey]?.label ?? v.grade}</span>
              <label className="flex items-center gap-1.5 text-[13px] text-mute"><input type="checkbox" className="h-3.5 w-3.5 accent-[var(--color-ink)]" checked={v.active} onChange={(e) => edit(v.id, { active: e.target.checked })} />Offered</label>
            </div>
            <div className="mt-2 grid grid-cols-[1.4fr_1fr] gap-2">
              <label className="text-[12.5px] text-mute">Price ₹
                <input className="field !min-h-[38px] !px-2 text-[15px] text-ink" inputMode="numeric" value={v.priceText} onChange={(e) => edit(v.id, { priceText: e.target.value.replace(/\D/g, '') })} />
              </label>
              <Link href={`/admin/inventory?product=${p.id}&grade=${v.grade}&status=available`} className="text-[12.5px] text-mute hover:underline">On sale<span className={`block text-[15px] font-semibold ${v.stock === 0 ? 'text-bad' : 'text-ink'}`}>{v.stock} {v.stock === 1 ? 'unit' : 'units'}</span></Link>
            </div>
          </div>
        ))}
      </div>
      {dirty && (
        <div className="mt-3 flex justify-end">
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}
    </li>
  );
}
