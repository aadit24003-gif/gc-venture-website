'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { CardProduct } from '@/lib/products';
import {
  BRANDS, BUDGETS, CPUS, EMPTY, RAMS, SCREENS, SORTS, USES,
  activeCount, applyFilters, toQuery, type Filters,
} from '@/lib/filters';
import { GRADES, GRADE_ORDER } from '@/lib/config';
import { BRAND_MARKS } from '@/lib/brand-marks';
import ProductCard from '../ProductCard';

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function Catalogue({ items, initial }: { items: CardProduct[]; initial: Filters }) {
  const [f, setF] = useState<Filters>(initial);
  const [sheet, setSheet] = useState(false);
  const results = useMemo(() => applyFilters(items, f), [items, f]);
  const n = activeCount(f);

  useEffect(() => {
    const url = `/laptops${toQuery(f)}`;
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, '', url);
  }, [f]);

  useEffect(() => {
    document.documentElement.style.overflow = sheet ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [sheet]);

  const set = (patch: Partial<Filters>) => setF((s) => ({ ...s, ...patch }));

  const panel = (
    <div className="space-y-7">
      <Group title="Brand">
        <div className="grid grid-cols-2 gap-2">
          {BRANDS.map((b) => {
            const mark = BRAND_MARKS[b.toLowerCase() as keyof typeof BRAND_MARKS];
            return (
              <button key={b} type="button" className="chip !justify-start !rounded-xl" aria-pressed={f.brand.includes(b)} onClick={() => set({ brand: toggle(f.brand, b) })}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d={mark} fill="currentColor" /></svg>
                {b === 'Apple' ? 'Apple' : b}
              </button>
            );
          })}
        </div>
      </Group>
      <Group title="Budget">
        <div className="flex flex-col gap-1">
          {BUDGETS.map((b) => (
            <Radio key={b.key} name="budget" checked={f.budget === b.key} onChange={() => set({ budget: f.budget === b.key ? null : b.key, min: null, max: null })} label={b.label} />
          ))}
          {(f.min || f.max) && !f.budget && (
            <p className="mt-1 text-[14px] text-mute">
              {f.min ? `From ₹${f.min.toLocaleString('en-IN')}` : ''}{f.min && f.max ? ' ' : ''}{f.max ? `up to ₹${f.max.toLocaleString('en-IN')}` : ''}
              <button type="button" className="link ml-2" onClick={() => set({ min: null, max: null })}>Clear</button>
            </p>
          )}
        </div>
      </Group>
      <Group title="Processor">
        <div className="flex flex-col gap-1">
          {CPUS.map((c) => (
            <Check key={c.key} checked={f.cpu.includes(c.key)} onChange={() => set({ cpu: toggle(f.cpu, c.key) })} label={c.label} />
          ))}
        </div>
      </Group>
      <Group title="Memory, at least">
        <div className="flex flex-wrap gap-2">
          {RAMS.map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={f.ram === r} onClick={() => set({ ram: f.ram === r ? null : r })}>{r} GB</button>
          ))}
        </div>
        <p className="hint">Includes models you can upgrade to this size.</p>
      </Group>
      <Group title="Screen">
        <div className="flex flex-wrap gap-2">
          {SCREENS.map((s) => (
            <button key={s.key} type="button" className="chip" aria-pressed={f.screen.includes(s.key)} onClick={() => set({ screen: toggle(f.screen, s.key) })}>{s.label}</button>
          ))}
        </div>
      </Group>
      <Group title="Condition grade">
        <div className="flex flex-col gap-1">
          {GRADE_ORDER.map((g) => (
            <Check key={g} checked={f.grade.includes(g)} onChange={() => set({ grade: toggle(f.grade, g) })} label={GRADES[g].label} note={GRADES[g].short} />
          ))}
        </div>
      </Group>
      <Check checked={f.soldOut} onChange={() => set({ soldOut: !f.soldOut })} label="Show sold-out models" />
    </div>
  );

  return (
    <div className="mt-8">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
        <button type="button" className="chip shrink-0" aria-pressed={!f.use} onClick={() => set({ use: null })}>Everything</button>
        {USES.map((u) => (
          <button key={u.key} type="button" className="chip shrink-0" aria-pressed={f.use === u.key} onClick={() => set({ use: f.use === u.key ? null : u.key })} title={u.blurb}>
            {u.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 max-h-[calc(100dvh-110px)] overflow-y-auto pb-6 pr-2 [scrollbar-width:thin]">{panel}</div>
        </aside>

        <section aria-labelledby="results-h">
          <h2 id="results-h" className="sr-only">Laptops</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="results-count" className="text-[15px] text-mute" aria-live="polite">
              <span className="font-semibold text-spruce">{results.length}</span> {results.length === 1 ? 'laptop' : 'laptops'}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setSheet(true)}>
                <SlidersHorizontal size={16} /> Filters{n ? ` (${n})` : ''}
              </button>
              <label className="sr-only" htmlFor="sort">Sort</label>
              <select id="sort" className="field !min-h-[38px] !w-auto !rounded-[11px] !py-0 text-[14.5px]" value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {n > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ActiveChips f={f} set={set} />
              <button type="button" className="link text-[14px]" onClick={() => setF({ ...EMPTY, sort: f.sort })}>Clear all</button>
            </div>
          )}

          {results.length === 0 ? (
            <div className="mt-8 rounded-[24px] bg-white p-8">
              <p className="text-[19px] font-semibold text-spruce">No laptop matches all of these filters.</p>
              <p className="mt-2 text-mute">Remove one of the filters above, or tell us what you need on WhatsApp and we will check incoming stock.</p>
              <button type="button" className="btn btn-primary mt-5" onClick={() => setF({ ...EMPTY, sort: f.sort })}>Show all laptops</button>
            </div>
          ) : (
            <LayoutGroup>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {results.map((p, i) => (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }}
                    >
                      <ProductCard p={p} priority={i < 3} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </LayoutGroup>
          )}
        </section>
      </div>

      <AnimatePresence>
        {sheet && (
          <motion.div className="fixed inset-0 z-[75] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-spruce/40" onClick={() => setSheet(false)} aria-hidden />
            <motion.div
              role="dialog" aria-modal="true" aria-label="Filters"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] bg-bench"
            >
              <div className="flex items-center justify-between px-5 pb-3 pt-5">
                <h2 className="text-[24px]">Filters</h2>
                <button type="button" onClick={() => setSheet(false)} className="rounded-xl p-2 text-spruce" aria-label="Close filters"><X size={22} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6">{panel}</div>
              <div className="flex gap-3 border-t border-line bg-white px-5 py-4">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => setF({ ...EMPTY, sort: f.sort })}>Clear</button>
                <button type="button" className="btn btn-primary flex-[2]" onClick={() => setSheet(false)}>Show {results.length} {results.length === 1 ? 'laptop' : 'laptops'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[15px] font-semibold text-spruce">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({ checked, onChange, label, note }: { checked: boolean; onChange: () => void; label: string; note?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-white">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-[var(--color-spruce)]" />
      <span className="text-[15px] leading-snug">{label}{note && <span className="block text-[13px] text-mute">{note}</span>}</span>
    </label>
  );
}

function Radio({ checked, onChange, label, name }: { checked: boolean; onChange: () => void; label: string; name: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-white">
      <input type="radio" name={name} checked={checked} onChange={onChange} onClick={() => checked && onChange()} className="h-[18px] w-[18px] shrink-0 accent-[var(--color-spruce)]" />
      <span className="text-[15px]">{label}</span>
    </label>
  );
}

function ActiveChips({ f, set }: { f: Filters; set: (p: Partial<Filters>) => void }) {
  const chips: { label: string; clear: () => void }[] = [];
  if (f.q) chips.push({ label: `“${f.q}”`, clear: () => set({ q: '' }) });
  f.brand.forEach((b) => chips.push({ label: b, clear: () => set({ brand: f.brand.filter((x) => x !== b) }) }));
  if (f.use) chips.push({ label: USES.find((u) => u.key === f.use)!.label, clear: () => set({ use: null }) });
  if (f.budget) chips.push({ label: BUDGETS.find((b) => b.key === f.budget)!.label, clear: () => set({ budget: null }) });
  if (f.min || f.max) chips.push({ label: `${f.min ? `₹${f.min.toLocaleString('en-IN')}` : '₹0'}–${f.max ? `₹${f.max.toLocaleString('en-IN')}` : 'any'}`, clear: () => set({ min: null, max: null }) });
  f.cpu.forEach((c) => chips.push({ label: CPUS.find((x) => x.key === c)!.label, clear: () => set({ cpu: f.cpu.filter((x) => x !== c) }) }));
  if (f.ram) chips.push({ label: `${f.ram} GB+ memory`, clear: () => set({ ram: null }) });
  f.screen.forEach((s) => chips.push({ label: SCREENS.find((x) => x.key === s)!.label, clear: () => set({ screen: f.screen.filter((x) => x !== s) }) }));
  f.grade.forEach((g) => chips.push({ label: GRADES[g].label, clear: () => set({ grade: f.grade.filter((x) => x !== g) }) }));
  return (
    <>
      {chips.map((c) => (
        <button key={c.label} type="button" onClick={c.clear} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-spruce px-3 text-[13.5px] font-medium text-white" aria-label={`Remove filter ${c.label}`}>
          {c.label} <X size={14} aria-hidden />
        </button>
      ))}
    </>
  );
}
