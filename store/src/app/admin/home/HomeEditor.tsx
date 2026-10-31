'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { HomeSettings, HomeTile } from '@/lib/settings';
import { toast } from '@/components/Toaster';
import { saveHome } from './actions';

type Model = { slug: string; title: string; brand: string; photos: number };

/** Image choices for a tile, best first. */
function imageOptions(slug: string) {
  if (!slug) return [];
  return [
    [`/media/cutout/${slug}`, 'Automatic: main photo without its background'],
    [`/media/cutout/${slug}?n=2`, 'Automatic: second photo without its background'],
    [`/products/${slug}/front.webp`, 'Prepared front view (if made with scripts/make-front.cjs)'],
    [`/products/${slug}/cutout.webp`, 'Prepared cut-out (if made with scripts/make-cutouts.cjs)'],
    [`/products/${slug}/1.webp`, 'Main photo as it is (white background)'],
  ] as const;
}

export default function HomeEditor({ initial, models, brands }: { initial: HomeSettings; models: Model[]; brands: string[] }) {
  const router = useRouter();
  const [h, setH] = useState<HomeSettings>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof HomeSettings>(k: K, v: HomeSettings[K]) => setH((x) => ({ ...x, [k]: v }));
  const setTile = (i: number, patch: Partial<HomeTile>) => setH((x) => ({ ...x, tiles: x.tiles.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const move = (i: number, by: number) => setH((x) => {
    const tiles = [...x.tiles];
    const [t] = tiles.splice(i, 1);
    tiles.splice(Math.max(0, Math.min(tiles.length, i + by)), 0, t);
    return { ...x, tiles };
  });
  const save = () => start(async () => {
    const r = await saveHome(h);
    if (!r.ok) { toast(r.error ?? 'Could not save', 'error'); return; }
    toast(r.message ?? 'Saved');
    router.refresh();
  });

  const field = (id: string, label: string, value: string, onChange: (v: string) => void, hint?: string, wide = false) => (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="sheet grid gap-4 p-6 sm:grid-cols-2" aria-label="Headline">
        <h2 className="text-[20px] sm:col-span-2">Headline</h2>
        {field('h-badge', 'Small label above the headline', h.badge, (v) => set('badge', v), '{save} becomes the biggest saving against new, e.g. 81.', true)}
        {field('h-head', 'Headline', h.headline, (v) => set('headline', v))}
        {field('h-accent', 'Headline, second part (orange)', h.accent, (v) => set('accent', v))}
        <div className="sm:col-span-2">
          <label htmlFor="h-sub" className="label">Line under the headline</label>
          <textarea id="h-sub" className="field" value={h.subline} onChange={(e) => set('subline', e.target.value)} />
          <p className="hint">{'{from}'} becomes the lowest price in stock.</p>
        </div>
      </section>

      <section className="sheet p-6" aria-label="Brand tiles">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px]">Brand tiles</h2>
          <button type="button" className="btn btn-ghost btn-sm" disabled={h.tiles.length >= 8}
            onClick={() => set('tiles', [...h.tiles, { title: 'New tile', subtitle: '', product: '', brand: brands[0] ?? '', href: '/laptops', image: '', dark: h.tiles.length % 2 === 0 }])}>
            <Plus size={15} /> Add a tile
          </button>
        </div>
        <p className="hint">Tiles appear two per row on computers, in this order. Dark tiles are black glass; light tiles are white glass.</p>
        <ol className="mt-4 space-y-4">
          {h.tiles.map((t, i) => (
            <li key={i} className="grid gap-4 rounded-card border border-line p-5 lg:grid-cols-[1fr_260px]">
              <div className="grid gap-4 sm:grid-cols-2">
                {field(`t${i}-title`, 'Title', t.title, (v) => setTile(i, { title: v }))}
                {field(`t${i}-sub`, 'Subtitle', t.subtitle, (v) => setTile(i, { subtitle: v }))}
                <div>
                  <label htmlFor={`t${i}-model`} className="label">Model for the price and photo</label>
                  <select id={`t${i}-model`} className="field" value={t.product} onChange={(e) => {
                    const m = models.find((x) => x.slug === e.target.value);
                    setTile(i, { product: e.target.value, ...(m ? { brand: m.brand, image: `/media/cutout/${m.slug}` } : {}) });
                  }}>
                    <option value="">None (use the brand’s lowest price)</option>
                    {models.map((m) => <option key={m.slug} value={m.slug}>{m.title}{m.photos ? '' : ' (no photos yet)'}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`t${i}-brand`} className="label">Brand</label>
                  <select id={`t${i}-brand`} className="field" value={t.brand} onChange={(e) => setTile(i, { brand: e.target.value })}>
                    {[...new Set([...brands, t.brand].filter(Boolean))].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                {field(`t${i}-href`, 'Link', t.href, (v) => setTile(i, { href: v }), 'e.g. /brands/dell or /laptops?q=x1')}
                <div>
                  <label htmlFor={`t${i}-img`} className="label">Photo</label>
                  <select id={`t${i}-imgsel`} aria-label="Photo choice" className="field" value={imageOptions(t.product).some(([v]) => v === t.image) ? t.image : ''} onChange={(e) => e.target.value && setTile(i, { image: e.target.value })}>
                    <option value="">Custom path…</option>
                    {imageOptions(t.product).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input id={`t${i}-img`} className="field mono mt-2 !text-[12.5px]" value={t.image} onChange={(e) => setTile(i, { image: e.target.value })} placeholder="/products/…/front.webp" />
                </div>
                <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="check" checked={t.dark} onChange={(e) => setTile(i, { dark: e.target.checked })} /> Dark tile</label>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === h.tiles.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={h.tiles.length <= 1} onClick={() => set('tiles', h.tiles.filter((_, j) => j !== i))}><Trash2 size={15} /> Remove</button>
                </div>
              </div>
              <div className={`flex flex-col items-center justify-end overflow-hidden rounded-card px-4 pt-5 text-center ${t.dark ? 'bg-[#111] text-white' : 'bg-canvas'}`}>
                <p className="text-[18px] font-semibold">{t.title}</p>
                <p className={`text-[12.5px] ${t.dark ? 'text-white/70' : 'text-mute'}`}>{t.subtitle}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.image ? <img src={t.image} alt="" className="mt-3 max-h-[130px] w-full object-contain object-bottom" /> : <p className="mt-3 pb-6 text-[12.5px] text-faint">No photo</p>}
              </div>
            </li>
          ))}
        </ol>
        <label className="mt-5 flex items-center gap-2 text-[14px]"><input type="checkbox" className="check" checked={h.studentsTile} onChange={(e) => set('studentsTile', e.target.checked)} /> Show the “Students save 10%” tile under the brand tiles</label>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button type="button" className="btn btn-primary btn-lg shadow-[var(--shadow-pop)]" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save home page'}</button>
      </div>
    </div>
  );
}
