'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import type { CardProduct } from '@/lib/products';
import { USES } from '@/lib/filters';
import ProductCard from '../ProductCard';

const MIN = 15_000;
const MAX = 1_20_000;

/** "What's it for, and how much?" Results reshuffle as you choose. */
export default function Finder({ items }: { items: CardProduct[] }) {
  const [use, setUse] = useState<string>('study');
  const [budget, setBudget] = useState(40_000);

  const matches = useMemo(() => items
    .filter((p) => p.inStock && p.uses.includes(use) && p.fromPrice / 100 <= budget)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.fromPrice - a.fromPrice), [items, use, budget]);
  const top = matches.slice(0, 4);
  const pct = ((budget - MIN) / (MAX - MIN)) * 100;

  return (
    <div>
      <div className="grid gap-8 rounded-[32px] bg-white p-6 md:p-9 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <fieldset>
          <legend className="mb-3 text-[15px] font-semibold text-spruce">What will you use it for?</legend>
          <div className="flex flex-wrap gap-2">
            {USES.map((u) => (
              <button key={u.key} type="button" className="chip" aria-pressed={use === u.key} onClick={() => setUse(u.key)}>{u.label}</button>
            ))}
          </div>
          <p className="mt-3 text-[14px] text-mute">{USES.find((u) => u.key === use)?.blurb}</p>
        </fieldset>
        <div>
          <label htmlFor="budget" className="flex items-baseline justify-between text-[15px] font-semibold text-spruce">
            Budget <span className="price text-[30px]">up to ₹{budget.toLocaleString('en-IN')}</span>
          </label>
          <input
            id="budget" type="range" min={MIN} max={MAX} step={5_000} value={budget} onChange={(e) => setBudget(Number(e.target.value))}
            className="range mt-3 w-full" style={{ ['--pct' as string]: `${pct}%` }}
            aria-valuetext={`Up to ₹${budget.toLocaleString('en-IN')}`}
          />
          <div className="mt-1 flex justify-between text-[12.5px] text-mute"><span>₹15,000</span><span>₹1,20,000</span></div>
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <p className="text-[15px] text-mute" aria-live="polite">
          {matches.length ? <><span className="font-semibold text-spruce">{matches.length}</span> {matches.length === 1 ? 'laptop fits' : 'laptops fit'}, newest first</> : 'Nothing in stock fits yet. Raise the budget a little.'}
        </p>
        {matches.length > 4 && <Link href={`/laptops?use=${use}&max=${budget}`} className="link shrink-0 text-[15px]">See all {matches.length}</Link>}
      </div>
      <LayoutGroup>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {top.map((p) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
                <ProductCard p={p} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>
    </div>
  );
}
