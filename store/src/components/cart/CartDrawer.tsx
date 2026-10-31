'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, Trash2, X } from 'lucide-react';
import { useCart } from './CartContext';
import { GRADES } from '@/lib/config';
import { gb, rupees } from '@/lib/format';
import ProductImage from '../ui/ProductImage';

export default function CartDrawer() {
  const { cart, open, setOpen, remove, busy } = useCart();
  const path = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [path, setOpen]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => closeRef.current?.focus(), 30);
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  }, [open, setOpen]);

  const ok = cart.lines.filter((l) => l.available);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            type="button" aria-label="Close cart" tabIndex={-1}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog" aria-modal="true" aria-labelledby="cart-title"
            className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-white shadow-[var(--shadow-pop)]"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="cart-title" className="text-[20px]">Your cart <span className="text-mute">({cart.count})</span></h2>
              <button ref={closeRef} type="button" className="btn btn-quiet btn-icon" onClick={() => setOpen(false)} aria-label="Close cart"><X size={20} /></button>
            </div>
            {cart.lines.length === 0 ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <p className="text-[17px] font-semibold">Your cart is empty</p>
                  <p className="mt-1 text-mute">Every laptop is a specific, inspected unit. Pick one you like.</p>
                  <Link href="/laptops" className="btn btn-primary mt-5">Shop laptops</Link>
                </div>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {cart.lines.map((l) => (
                    <li key={l.itemId} className="flex gap-4 py-4">
                      <Link href={`/laptops/${l.slug}`} className="well h-[76px] w-[96px] shrink-0 rounded-xl border border-line p-1.5">
                        <ProductImage image={l.image} art={l.art} brand={l.brand} slug={l.slug} title={l.title} sizes="96px" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/laptops/${l.slug}`} className="block font-semibold leading-snug hover:underline">{l.title}</Link>
                        <p className="mt-0.5 text-[13px] text-mute">{GRADES[l.grade].label} · {gb(l.ramGb)} · {gb(l.ssdGb)} SSD{l.warrantyMonths > 12 ? ` · ${l.warrantyMonths / 12}-yr warranty` : ''}</p>
                        <p className="mono mt-0.5 text-[11.5px] text-faint">Unit {l.unitCode}{l.batteryHealth ? ` · battery ${l.batteryHealth}%` : ''}</p>
                        {l.problem ? <p className="mt-1 text-[13px] font-medium text-bad">{l.problem}</p> : null}
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="price text-[16px]">{l.price != null ? rupees(l.price) : '—'}</span>
                          <button type="button" className="inline-flex items-center gap-1 text-[13px] text-mute hover:text-bad" onClick={() => remove(l.itemId)} disabled={busy}>
                            <Trash2 size={14} aria-hidden="true" /> Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-line p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Subtotal ({ok.length} {ok.length === 1 ? 'laptop' : 'laptops'})</span>
                    <span className="price text-[22px]">{rupees(cart.subtotal)}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-mute"><ShieldCheck size={15} aria-hidden="true" /> Units aren’t held until you check out.</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href="/cart" className="btn btn-ghost">View cart</Link>
                    <Link href="/checkout" className={`btn btn-primary ${ok.length ? '' : 'pointer-events-none opacity-50'}`} aria-disabled={!ok.length}>Checkout</Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
