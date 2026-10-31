'use client';

/** Quick search over the catalogue (Ctrl/⌘ K or "/"). Loads the list the first time it opens. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import type { CardProduct } from '@/lib/products';
import { rupees, gb } from '@/lib/format';
import ProductImage from './ui/ProductImage';

let cached: CardProduct[] | null = null;

const SUGGEST = ['ThinkPad', 'MacBook Air', '16 GB', 'Under 30000', 'Latitude 7', 'Thunderbolt'];

function score(p: CardProduct, q: string): number {
  const hay = `${p.title} ${p.family} ${p.cpu} ${p.cpuShort} ${p.ramGb}gb ${p.ramGb} gb ${p.screenIn}" ${p.year} ${p.uses.join(' ')} ${p.tags.join(' ')}`.toLowerCase();
  const under = q.match(/under\s*₹?\s*([\d,]+)/i);
  if (under) {
    const cap = Number(under[1].replace(/,/g, '')) * 100;
    if (p.fromPrice > cap) return 0;
    q = q.replace(under[0], '').trim();
    if (!q) return 1;
  }
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const w of words) {
    if (hay.includes(w)) s += w.length > 2 ? 2 : 1;
    else return 0;
  }
  return s + (p.title.toLowerCase().startsWith(words[0] ?? '') ? 2 : 0);
}

export default function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<CardProduct[] | null>(cached);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setQ('');
    setSel(0);
    if (!cached) {
      fetch('/api/catalogue').then((r) => r.json()).then((d: CardProduct[]) => { cached = d; setItems(d); }).catch(() => setItems([]));
    }
    const t = setTimeout(() => input.current?.focus(), 30);
    document.documentElement.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.documentElement.style.overflow = ''; };
  }, [open]);

  const results = useMemo(() => {
    if (!items) return [];
    const query = q.trim();
    if (!query) return items.filter((p) => p.featured).slice(0, 6);
    return items
      .map((p) => ({ p, s: score(p, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.p.fromPrice - b.p.fromPrice)
      .slice(0, 8)
      .map((x) => x.p);
  }, [items, q]);

  useEffect(() => setSel(0), [q]);

  const go = (slug: string) => { onClose(); router.push(`/laptops/${slug}`); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/40 px-3 pt-[10vh] backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Search laptops"
            initial={{ y: -14, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="w-full max-w-[640px] overflow-hidden rounded-sheet bg-white shadow-[0_40px_80px_-30px_rgba(14,15,18,.5)]"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === 'Enter' && results[sel]) { e.preventDefault(); go(results[sel].slug); }
            }}
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search size={20} className="text-mute" aria-hidden />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Model, processor or budget, e.g. T14 16 GB"
                className="h-16 flex-1 bg-transparent text-[17px] outline-none placeholder:text-mute/70"
                aria-label="Search"
                role="combobox"
                aria-expanded="true"
                aria-controls="search-results"
                aria-activedescendant={results[sel] ? `sr-${results[sel].id}` : undefined}
              />
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-mute hover:bg-canvas hover:text-ink" aria-label="Close search"><X size={20} /></button>
            </div>
            {!q && (
              <div className="flex flex-wrap gap-2 px-5 pt-4">
                {SUGGEST.map((s) => (
                  <button key={s} type="button" className="chip !min-h-[34px] !text-[13.5px]" onClick={() => setQ(s)}>{s}</button>
                ))}
              </div>
            )}
            <ul id="search-results" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
              {!items && <li className="px-4 py-6 text-mute">Loading the catalogue…</li>}
              {items && results.length === 0 && (
                <li className="px-4 py-6 text-mute">
                  No laptop matches “{q}”. Try a brand, a model number or a budget like “under 30000”.
                </li>
              )}
              {results.map((p, i) => (
                <li key={p.id} id={`sr-${p.id}`} role="option" aria-selected={i === sel}>
                  <Link
                    href={`/laptops/${p.slug}`}
                    onClick={onClose}
                    onMouseEnter={() => setSel(i)}
                    className={`flex items-center gap-4 rounded-2xl px-3 py-2.5 ${i === sel ? 'bg-canvas' : ''}`}
                  >
                    <span className="well h-[54px] w-[72px] shrink-0 rounded-lg border border-line p-1"><ProductImage image={p.image} art={p.art} brand={p.brand} slug={p.slug} title={p.title} sizes="72px" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{p.title}</span>
                      <span className="block truncate text-[14px] text-mute">{p.cpuShort}, {gb(p.ramGb)}, {gb(p.ssdGb)}, {p.screenIn}″</span>
                    </span>
                    <span className="shrink-0 text-right"><span className="price block text-[17px]">{rupees(p.fromPrice)}</span><span className="block text-[12px] text-mute">{p.inStock ? `${p.unitsOnSale} on sale` : 'Sold out'}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
            {q && results.length > 0 && (
              <div className="border-t border-line px-5 py-3 text-[14px]">
                <Link href={`/laptops?q=${encodeURIComponent(q)}`} onClick={onClose} className="link">See every match in the catalogue</Link>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
