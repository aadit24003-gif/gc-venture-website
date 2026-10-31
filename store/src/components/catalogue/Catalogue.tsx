'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { CardProduct } from '@/lib/products';
import { GRADES, GRADE_ORDER, type GradeKey } from '@/lib/config';
import { BRANDS, BUDGETS, CPUS, EMPTY, GENS, RAMS, SCREENS, SORTS, SSDS, USES, activeCount, applyFilters, toQuery, type Filters } from '@/lib/filters';
import ProductCard from '../ProductCard';

type Opt = { key: string; label: string; n?: number };

function Group({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[14.5px] font-semibold [&::-webkit-details-marker]:hidden">
        {title}<span className="text-[18px] font-normal text-mute transition-transform group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Checks({ name, options, value, onChange }: { name: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <ul className="space-y-1.5">
      {options.map((o) => {
        const id = `${name}-${o.key}`;
        const on = value.includes(o.key);
        return (
          <li key={o.key}>
            <label htmlFor={id} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-[14px] hover:bg-canvas ${o.n === 0 && !on ? 'text-faint' : ''}`}>
              <input id={id} type="checkbox" className="check" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== o.key) : [...value, o.key])} />
              <span className="flex-1">{o.label}</span>
              {o.n != null && <span className="mono text-[11.5px] text-faint">{o.n}</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function Catalogue({ items, initial, base = {}, wished = [] }: { items: CardProduct[]; initial: Filters; base?: Partial<Filters>; wished?: string[] }) {
  const [f, setF] = useState<Filters>(initial);
  const [sheet, setSheet] = useState(false);
  const [minIn, setMinIn] = useState(initial.min ? String(initial.min) : '');
  const [maxIn, setMaxIn] = useState(initial.max ? String(initial.max) : '');
  const path = usePathname();
  const wish = useMemo(() => new Set(wished), [wished]);

  const baseKey = JSON.stringify(base);
  useEffect(() => {
    // Keep the URL shareable without a server round trip.
    const q = toQuery(f, JSON.parse(baseKey));
    if (q !== window.location.search) window.history.replaceState(null, '', `${path}${q}`);
  }, [f, path, baseKey]);

  const results = useMemo(() => applyFilters(items, f), [items, f]);
  // Counts for each option, given the other filters.
  const count = (patch: Partial<Filters>) => applyFilters(items, { ...f, ...patch }).length;
  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, ...patch }));
  const n = activeCount(f, base);

  const panel = (
    <div>
      <Group title="Availability">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-[14px] hover:bg-canvas">
          <input type="checkbox" className="check" checked={!f.soldOut} onChange={() => set({ soldOut: !f.soldOut })} />
          <span className="flex-1">In stock only</span>
        </label>
      </Group>
      {!base.brand?.length && (
        <Group title="Brand">
          <Checks name="brand" value={f.brand} onChange={(brand) => set({ brand })} options={BRANDS.map((b) => ({ key: b, label: b, n: count({ brand: [b] }) }))} />
        </Group>
      )}
      <Group title="Price">
        <div className="flex flex-wrap gap-1.5">
          {BUDGETS.map((b) => <button key={b.key} type="button" className="chip !min-h-8 !text-[13px]" aria-pressed={f.budget === b.key} onClick={() => set({ budget: f.budget === b.key ? null : b.key, min: null, max: null })}>{b.short}</button>)}
        </div>
        <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); set({ min: Number(minIn) || null, max: Number(maxIn) || null, budget: null }); }}>
          <div className="flex-1"><label htmlFor="pmin" className="text-[12px] text-mute">Min ₹</label><input id="pmin" inputMode="numeric" className="field !min-h-9 text-[14px]" value={minIn} onChange={(e) => setMinIn(e.target.value.replace(/\D/g, ''))} /></div>
          <div className="flex-1"><label htmlFor="pmax" className="text-[12px] text-mute">Max ₹</label><input id="pmax" inputMode="numeric" className="field !min-h-9 text-[14px]" value={maxIn} onChange={(e) => setMaxIn(e.target.value.replace(/\D/g, ''))} /></div>
          <button className="btn btn-ghost btn-sm">Go</button>
        </form>
      </Group>
      <Group title="Condition grade">
        <Checks name="grade" value={f.grade} onChange={(g) => set({ grade: g as GradeKey[] })} options={GRADE_ORDER.map((g) => ({ key: g, label: `${GRADES[g].label} · ${GRADES[g].short.toLowerCase()}`, n: count({ grade: [g] }) }))} />
      </Group>
      <Group title="Processor">
        <Checks name="cpu" value={f.cpu} onChange={(cpu) => set({ cpu })} options={CPUS.map((c) => ({ key: c.key, label: c.label, n: count({ cpu: [c.key] }) }))} />
      </Group>
      <Group title="Generation" open={false}>
        <Checks name="gen" value={f.gen} onChange={(gen) => set({ gen })} options={GENS.map((c) => ({ key: c.key, label: c.label, n: count({ gen: [c.key] }) }))} />
      </Group>
      <Group title="Memory (RAM)">
        <Checks name="ram" value={f.ram.map(String)} onChange={(v) => set({ ram: v.map(Number) })} options={RAMS.map((r) => ({ key: String(r), label: `${r} GB${r > 8 ? ' or upgradable to it' : ''}`, n: count({ ram: [r] }) }))} />
      </Group>
      <Group title="Storage (SSD)" open={false}>
        <Checks name="ssd" value={f.ssd.map(String)} onChange={(v) => set({ ssd: v.map(Number) })} options={SSDS.map((s) => ({ key: String(s.gb), label: s.label, n: count({ ssd: [s.gb] }) }))} />
      </Group>
      <Group title="Screen size" open={false}>
        <Checks name="screen" value={f.screen} onChange={(screen) => set({ screen })} options={SCREENS.map((s) => ({ key: s.key, label: s.label, n: count({ screen: [s.key] }) }))} />
      </Group>
      <Group title="Best for" open={false}>
        <div className="flex flex-wrap gap-1.5">
          {USES.map((u) => <button key={u.key} type="button" className="chip !min-h-8 !text-[13px]" aria-pressed={f.use === u.key} onClick={() => set({ use: f.use === u.key ? null : u.key })}>{u.label}</button>)}
        </div>
      </Group>
    </div>
  );

  const chips: { label: string; clear: () => void }[] = [
    ...(f.q ? [{ label: `“${f.q}”`, clear: () => set({ q: '' }) }] : []),
    ...(base.brand?.length ? [] : f.brand.map((b) => ({ label: b, clear: () => set({ brand: f.brand.filter((x) => x !== b) }) }))),
    ...(f.budget ? [{ label: BUDGETS.find((b) => b.key === f.budget)!.label, clear: () => set({ budget: null }) }] : []),
    ...(f.min || f.max ? [{ label: `₹${f.min ?? 0}–${f.max ?? '∞'}`, clear: () => { set({ min: null, max: null }); setMinIn(''); setMaxIn(''); } }] : []),
    ...f.grade.map((g) => ({ label: GRADES[g].label, clear: () => set({ grade: f.grade.filter((x) => x !== g) }) })),
    ...f.cpu.map((c) => ({ label: CPUS.find((x) => x.key === c)!.label, clear: () => set({ cpu: f.cpu.filter((x) => x !== c) }) })),
    ...f.gen.map((c) => ({ label: GENS.find((x) => x.key === c)!.label, clear: () => set({ gen: f.gen.filter((x) => x !== c) }) })),
    ...f.ram.map((r) => ({ label: `${r} GB RAM`, clear: () => set({ ram: f.ram.filter((x) => x !== r) }) })),
    ...f.ssd.map((r) => ({ label: `${r >= 1024 ? '1 TB' : `${r} GB`} SSD`, clear: () => set({ ssd: f.ssd.filter((x) => x !== r) }) })),
    ...f.screen.map((s) => ({ label: SCREENS.find((x) => x.key === s)!.label, clear: () => set({ screen: f.screen.filter((x) => x !== s) }) })),
    ...(f.use ? [{ label: USES.find((u) => u.key === f.use)!.label, clear: () => set({ use: null }) }] : []),
    ...(f.soldOut ? [{ label: 'Including sold out', clear: () => set({ soldOut: false }) }] : []),
  ];
  const reset = () => { setF({ ...EMPTY, sort: f.sort, brand: base.brand ?? [], category: base.category ?? null }); setMinIn(''); setMaxIn(''); };

  return (
    <div className="grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-[132px] max-h-[calc(100dvh-150px)] overflow-y-auto pr-2">
          <div className="flex items-center justify-between pb-1">
            <p className="font-semibold">Filters</p>
            {n > 0 && <button type="button" onClick={reset} className="text-[13px] text-mute underline">Clear all</button>}
          </div>
          {panel}
        </div>
      </aside>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-auto text-[14.5px] text-mute" role="status" aria-live="polite"><b className="text-ink">{results.length}</b> {results.length === 1 ? 'model' : 'models'}{!f.soldOut ? ' in stock' : ''}</p>
          <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setSheet(true)}><SlidersHorizontal size={16} /> Filters{n ? ` (${n})` : ''}</button>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" className="field !min-h-9 !w-auto text-[14px]" value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.label}><button type="button" onClick={c.clear} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] font-medium text-white" aria-label={`Remove filter ${c.label}`}>{c.label}<X size={14} aria-hidden="true" /></button></li>
            ))}
            <li><button type="button" onClick={reset} className="h-8 px-2 text-[13px] text-mute underline">Clear all</button></li>
          </ul>
        )}
        {results.length === 0 ? (
          <div className="mt-8 rounded-card border border-dashed border-line-2 p-10 text-center">
            <p className="text-[17px] font-semibold">Nothing matches all of that</p>
            <p className="mt-1 text-mute">Remove a filter{!f.soldOut ? ', or include sold-out models' : ''}.</p>
            <div className="mt-5 flex justify-center gap-2">
              {!f.soldOut && <button type="button" className="btn btn-ghost" onClick={() => set({ soldOut: true })}>Show sold out too</button>}
              <button type="button" className="btn btn-primary" onClick={reset}>Clear filters</button>
            </div>
          </div>
        ) : (
          <motion.ul layout className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {results.map((p, i) => (
                <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.22 }}>
                  <ProductCard p={p} priority={i < 3} wished={wish.has(p.id)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      <AnimatePresence>
        {sheet && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <motion.button type="button" tabIndex={-1} aria-label="Close filters" className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div role="dialog" aria-modal="true" aria-label="Filters" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-sheet bg-white">
              <div className="flex items-center justify-between border-b border-line px-5 py-4"><p className="text-[18px] font-semibold">Filters</p><button type="button" className="btn btn-quiet btn-icon" aria-label="Close filters" onClick={() => setSheet(false)}><X size={20} /></button></div>
              <div className="flex-1 overflow-y-auto px-5">{panel}</div>
              <div className="grid grid-cols-2 gap-2 border-t border-line p-4">
                <button type="button" className="btn btn-ghost" onClick={reset}>Clear</button>
                <button type="button" className="btn btn-primary" onClick={() => setSheet(false)}>Show {results.length}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
