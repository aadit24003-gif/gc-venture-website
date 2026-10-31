'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useCart } from './CartContext';
import LaptopArt from '../LaptopArt';
import { GRADES, STUDENT } from '@/lib/config';
import { gb, rupees } from '@/lib/format';

export default function CartDrawer() {
  const { open, setOpen, lines, setQty, remove, subtotal, count } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-spruce/35 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Your cart"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-bench shadow-[-30px_0_60px_-30px_rgba(15,61,51,.5)] sm:rounded-l-[28px]"
          >
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <h2 className="text-[26px]">Your cart{count ? <span className="ml-2 text-mute">({count})</span> : null}</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-spruce hover:bg-white" aria-label="Close cart" autoFocus><X size={22} /></button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-start justify-center gap-4 px-6 pb-20">
                <p className="text-[18px] text-ink">Your cart is empty.</p>
                <p className="text-mute">Every laptop is tested, graded and covered by warranty.</p>
                <Link href="/laptops" onClick={() => setOpen(false)} className="btn btn-primary">Browse laptops</Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.key}
                        layout
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                        className="rounded-[20px] bg-white p-4"
                      >
                        <div className="flex gap-3">
                          <Link href={`/laptops/${l.slug}`} onClick={() => setOpen(false)} className="w-[92px] shrink-0 rounded-xl bg-bench p-1.5">
                            <LaptopArt art={l.art} brand={l.brand} slug={l.slug} flat />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link href={`/laptops/${l.slug}`} onClick={() => setOpen(false)} className="block font-semibold leading-snug text-spruce hover:underline">{l.title}</Link>
                            <p className="mt-0.5 text-[13.5px] text-mute">
                              {GRADES[l.grade].label} grade, {gb(l.ramGb)} memory, {gb(l.ssdGb)} SSD
                            </p>
                            {l.warrantyMonths > 12 && (
                              <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-pass"><ShieldCheck size={14} />{l.warrantyMonths / 12}-year warranty</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-xl bg-bench">
                            <button type="button" className="p-2.5 text-spruce disabled:opacity-40" onClick={() => setQty(l.key, l.qty - 1)} disabled={l.qty <= 1} aria-label={`One fewer ${l.title}`}><Minus size={16} /></button>
                            <span className="num w-8 text-center font-semibold" aria-live="polite">{l.qty}</span>
                            <button type="button" className="p-2.5 text-spruce disabled:opacity-40" onClick={() => setQty(l.key, l.qty + 1)} disabled={l.qty >= l.maxQty} aria-label={`One more ${l.title}`}><Plus size={16} /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="price text-[19px]">{rupees(l.unit * l.qty)}</span>
                            <button type="button" className="rounded-lg p-2 text-mute hover:bg-bench hover:text-alert" onClick={() => remove(l.key)} aria-label={`Remove ${l.title}`}><Trash2 size={17} /></button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <div className="border-t border-line bg-white px-6 pb-6 pt-5 sm:rounded-bl-[28px]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-ink">Subtotal</span>
                    <span className="price text-[26px]">{rupees(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-mute">Free delivery. Student discount ({STUDENT.percent}%) and coupons apply at checkout.</p>
                  <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-primary btn-lg mt-4 w-full">Check out</Link>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
