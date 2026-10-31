'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useCart } from './CartContext';
import { GRADES, POLICY } from '@/lib/config';
import { gb, rupees } from '@/lib/format';
import type { CardProduct } from '@/lib/products';
import ProductImage from '../ui/ProductImage';
import ProductCard from '../ProductCard';
import { toast } from '../Toaster';

export default function CartPage({ picks }: { picks: CardProduct[] }) {
  const { cart, update, remove, busy } = useCart();
  const ok = cart.lines.filter((l) => l.available);
  if (!cart.lines.length) {
    return (
      <>
        <div className="mt-8 rounded-card border border-dashed border-line-2 p-10 text-center">
          <p className="text-[18px] font-semibold">Nothing here yet</p>
          <p className="mt-1 text-mute">Each laptop is a specific inspected unit. Choose the one you want on its page.</p>
          <Link href="/laptops" className="btn btn-primary mt-5">Shop laptops</Link>
        </div>
        {picks.length > 0 && <><h2 className="mt-16 text-[26px]">Our picks</h2><ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{picks.map((p) => <li key={p.id}><ProductCard p={p} /></li>)}</ul></>}
      </>
    );
  }
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ul className="space-y-4">
        {cart.lines.map((l) => (
          <li key={l.itemId} className={`card flex flex-col gap-5 p-5 sm:flex-row ${l.available ? '' : 'opacity-75'}`}>
            <Link href={`/laptops/${l.slug}`} className="well h-[120px] w-full shrink-0 rounded-xl border border-line p-2 sm:w-[160px]"><ProductImage image={l.image} art={l.art} brand={l.brand} slug={l.slug} title={l.title} sizes="160px" /></Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/laptops/${l.slug}`} className="text-[17px] font-semibold hover:underline">{l.title}</Link>
                  <p className="mono mt-0.5 text-[12px] text-mute">Unit {l.unitCode} · <Link href={`/units/${l.unitCode}`} className="underline">report</Link></p>
                </div>
                <p className="price text-[20px]">{l.price != null ? rupees(l.price) : '—'}</p>
              </div>
              <p className="mt-2 text-[13.5px] text-ink-2">{GRADES[l.grade].label} grade{l.batteryHealth ? ` · battery ${l.batteryHealth}%` : ''}{l.cosmeticNotes ? ` · ${l.cosmeticNotes}` : ''}</p>
              {l.problem && <p className="mt-2 rounded-lg bg-bad-soft px-3 py-2 text-[13.5px] text-bad">{l.problem} <Link href={`/laptops/${l.slug}`} className="underline">See other units</Link></p>}
              {l.available && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor={`r-${l.itemId}`} className="text-[12px] text-mute">Memory</label>
                    <select id={`r-${l.itemId}`} className="field !min-h-9 text-[14px]" value={l.ramGb} disabled={busy || l.ramChoices.length < 2}
                      onChange={async (e) => { const r = await update(l.itemId, { ramGb: Number(e.target.value), ssdGb: l.ssdGb, warrantyMonths: l.warrantyMonths }); if (!r.ok) toast(r.error ?? 'Could not change', 'error'); }}>
                      {l.ramChoices.map((c) => <option key={c.gb} value={c.gb}>{gb(c.gb)}{c.extra ? ` +${rupees(c.extra)}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`s-${l.itemId}`} className="text-[12px] text-mute">Storage</label>
                    <select id={`s-${l.itemId}`} className="field !min-h-9 text-[14px]" value={l.ssdGb} disabled={busy || l.ssdChoices.length < 2}
                      onChange={async (e) => { const r = await update(l.itemId, { ramGb: l.ramGb, ssdGb: Number(e.target.value), warrantyMonths: l.warrantyMonths }); if (!r.ok) toast(r.error ?? 'Could not change', 'error'); }}>
                      {l.ssdChoices.map((c) => <option key={c.gb} value={c.gb}>{gb(c.gb)}{c.extra ? ` +${rupees(c.extra)}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`w-${l.itemId}`} className="text-[12px] text-mute">Warranty</label>
                    <select id={`w-${l.itemId}`} className="field !min-h-9 text-[14px]" value={l.warrantyMonths} disabled={busy}
                      onChange={async (e) => { const r = await update(l.itemId, { ramGb: l.ramGb, ssdGb: l.ssdGb, warrantyMonths: Number(e.target.value) }); if (!r.ok) toast(r.error ?? 'Could not change', 'error'); }}>
                      {POLICY.warrantyExtensions.map((w) => <option key={w.months} value={w.months}>{w.months} months{w.price ? ` +${rupees(w.price)}` : ''}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <button type="button" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-mute hover:text-bad" disabled={busy} onClick={() => remove(l.itemId)}><Trash2 size={15} aria-hidden="true" /> Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <aside className="lg:sticky lg:top-[132px] lg:self-start">
        <div className="card p-6">
          <div className="flex items-baseline justify-between"><span className="text-mute">Subtotal ({ok.length})</span><span className="price text-[26px]">{rupees(cart.subtotal)}</span></div>
          <p className="mt-1 text-[13px] text-mute">Delivery, discounts and GST are shown at checkout. Student discount applies automatically when you’re signed in and verified.</p>
          <Link href="/checkout" className={`btn btn-primary btn-lg mt-5 w-full ${ok.length ? '' : 'pointer-events-none opacity-50'}`} aria-disabled={!ok.length}>Go to checkout</Link>
          <Link href="/laptops" className="btn btn-ghost mt-2 w-full">Keep shopping</Link>
          <p className="mt-4 text-[12.5px] text-mute">Units in your cart aren’t held until you place the order; someone else could buy them first.</p>
        </div>
      </aside>
    </div>
  );
}
