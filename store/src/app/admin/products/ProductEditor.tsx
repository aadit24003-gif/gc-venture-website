'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react';
import LaptopArt from '@/components/LaptopArt';
import LidMarks from '@/components/LidMarks';
import { toast } from '@/components/Toaster';
import { GRADES, GRADE_ORDER } from '@/lib/config';
import type { ProductImage } from '@/lib/db/schema';
import { arrangePhotos, saveLaptop, uploadPhotos, type DetailsInput } from './editor-actions';

export type Form = Omit<DetailsInput, 'grades' | 'highlights' | 'categories' | 'tags' | 'specs' | 'seoTitle' | 'seoDescription' | 'featured' | 'active'> & {
  highlights: string[]; grades: { grade: string; price: number; stock?: number; active: boolean }[];
  categories: string[]; tags: string; specs: string; seoTitle: string | null; seoDescription: string | null; featured: boolean; active: boolean;
};

const STYLES = [['thinkpad', 'ThinkPad'], ['latitude', 'Latitude'], ['elitebook', 'EliteBook'], ['probook', 'ProBook'], ['macbook-air', 'MacBook Air'], ['macbook-pro', 'MacBook Pro']] as const;
const COLOURS = [['black', 'Black'], ['graphite', 'Graphite'], ['silver', 'Silver'], ['space-grey', 'Space grey'], ['midnight', 'Midnight'], ['starlight', 'Starlight']] as const;
const USES = [['study', 'Studying'], ['code', 'Coding'], ['design', 'Design and video'], ['office', 'Office work'], ['travel', 'Light to carry']] as const;


export default function ProductEditor({ initial, photos: initialPhotos, categories = [], units = {}, brands = [] }: { initial: Form; photos?: ProductImage[]; categories?: { slug: string; name: string }[]; units?: Record<string, number>; /** brand names from Admin → Brands and categories */ brands?: string[] }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(initial);
  const [photos, setPhotos] = useState<ProductImage[]>(initialPhotos ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [uploading, startUpload] = useTransition();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const slug = `${f.brand}-${f.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const save = () => start(async () => {
    setError(null);
    const r = await saveLaptop({ ...f, highlights: f.highlights.filter(Boolean) } as DetailsInput);
    if (!r.ok) { setError(r.error); return; }
    toast(initial.id ? 'Saved' : `${f.brand} ${f.model} added`);
    if (!initial.id) router.push(`/admin/products/${r.id}`);
    else router.refresh();
  });

  const movePhoto = (i: number, by: number) => {
    const next = photos.slice();
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    setPhotos(next);
    startUpload(async () => { await arrangePhotos(initial.id!, next); });
  };

  const text = ({ k, label, hint, wide }: { k: keyof Form; label: string; hint?: string; wide?: boolean }) => (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={`f-${String(k)}`} className="label">{label}</label>
      <input id={`f-${String(k)}`} className="field" value={String(f[k] ?? '')} onChange={(e) => set(k, e.target.value as never)} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
  const numField = ({ k, label, step = 1 }: { k: keyof Form; label: string; step?: number }) => (
    <div>
      <label htmlFor={`f-${String(k)}`} className="label">{label}</label>
      <input id={`f-${String(k)}`} className="field" type="number" step={step} value={f[k] == null ? '' : String(f[k])} onChange={(e) => set(k, num(e.target.value) as never)} />
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="sheet grid gap-4 p-6 sm:grid-cols-2" aria-label="Model">
          <h2 className="text-[22px] sm:col-span-2">Model</h2>
          <div>
            <label htmlFor="f-brand" className="label">Brand</label>
            <select id="f-brand" className="field" value={f.brand} onChange={(e) => set('brand', e.target.value)}>
              {[...new Set([...(brands.length ? brands : ['Dell', 'HP', 'Lenovo', 'Apple']), f.brand].filter(Boolean))].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          {text({ k: 'family', label: 'Line', hint: 'Latitude, EliteBook, ThinkPad, MacBook Air…' })}
          {text({ k: 'model', label: 'Model', hint: !initial.id ? `Page address: /laptops/${slug}` : undefined })}
          {numField({ k: 'year', label: 'Model year' })}
          {text({ k: 'cpu', label: 'Processor', hint: 'Full name, e.g. Intel Core i5-1145G7' })}
          {text({ k: 'cpuShort', label: 'Processor, short', hint: 'Shown on cards, e.g. Core i5 11th Gen' })}
          <div>
            <label htmlFor="f-tier" className="label">Processor tier</label>
            <select id="f-tier" className="field" value={f.cpuTier} onChange={(e) => set('cpuTier', e.target.value)}>
              {['i3', 'i5', 'i7', 'i9', 'ultra5', 'ultra7', 'ryzen5', 'ryzen7', 'm1', 'm1pro', 'm2', 'm2pro', 'm3', 'm4'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-gen" className="label">Intel generation</label>
            <select id="f-gen" className="field" value={f.cpuGen ?? ''} onChange={(e) => set('cpuGen', num(e.target.value))}>
              <option value="">Not Intel (Apple, AMD)</option>
              {[6, 7, 8, 9, 10, 11, 12, 13, 14].map((g) => <option key={g} value={g}>{g}th Gen</option>)}
              <option value={15}>Core Ultra</option>
            </select>
          </div>
          {text({ k: 'gpu', label: 'Graphics' })}
          {text({ k: 'screenRes', label: 'Display', hint: 'e.g. Full HD 1920×1080' })}
          {numField({ k: 'screenIn', label: 'Screen size, inches', step: 0.1 })}
          {numField({ k: 'weightKg', label: 'Weight, kg', step: 0.01 })}
          {numField({ k: 'ramGb', label: 'Memory as listed, GB' })}
          {numField({ k: 'maxRamGb', label: 'Most memory it takes, GB' })}
          {numField({ k: 'ssdGb', label: 'Storage as listed, GB' })}
          <label className="flex items-center gap-2 self-end pb-3 text-[15px]"><input type="checkbox" className="h-[18px] w-[18px] accent-[var(--color-spruce)]" checked={f.touch} onChange={(e) => set('touch', e.target.checked)} />Touch screen</label>
          <p className="hint sm:col-span-2 !-mt-2">Set “most memory” to 0 if memory is soldered. Upgrades up to that size are offered automatically.</p>
          {text({ k: 'ports', label: 'Ports, separated by commas', wide: true })}
        </section>

        <section className="sheet grid gap-4 p-6" aria-label="Description">
          <h2 className="text-[22px]">Description</h2>
          <div>
            <label htmlFor="f-desc" className="label">Who it suits</label>
            <textarea id="f-desc" className="field" value={f.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {f.highlights.map((h, i) => (
              <div key={i}>
                <label htmlFor={`f-h${i}`} className="label">Highlight {i + 1}</label>
                <input id={`f-h${i}`} className="field" value={h} onChange={(e) => set('highlights', f.highlights.map((x, j) => (j === i ? e.target.value : x)))} />
              </div>
            ))}
          </div>
          <fieldset>
            <legend className="label">Good for</legend>
            <div className="flex flex-wrap gap-2">
              {USES.map(([k, l]) => (
                <button key={k} type="button" className="chip" aria-pressed={f.uses.includes(k)} onClick={() => set('uses', f.uses.includes(k) ? f.uses.filter((u) => u !== k) : [...f.uses, k])}>{l}</button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="sheet p-6" aria-label="Prices and stock">
          <h2 className="text-[22px]">Grade prices</h2>
          <p className="mt-1 text-[13.5px] text-mute">The price of a unit in each grade (a unit can override it). Stock is the units listed in Inventory.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {f.grades.map((g, i) => (
              <div key={g.grade} className="rounded-2xl bg-bench p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-spruce">{GRADES[g.grade as keyof typeof GRADES].label}</span>
                  <label className="flex items-center gap-1.5 text-[13px] text-mute"><input type="checkbox" className="accent-[var(--color-spruce)]" checked={g.active} onChange={(e) => set('grades', f.grades.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))} />Offered</label>
                </div>
                <div className="mt-2 grid grid-cols-[1.4fr_1fr] gap-2">
                  <p className="text-[12.5px] text-mute">{units[g.grade] ?? 0} on sale</p>
                  <label className="text-[12.5px] text-mute">Price ₹<input className="field !min-h-[40px] !px-2 text-[15px] text-ink" inputMode="numeric" value={g.price || ''} onChange={(e) => set('grades', f.grades.map((x, j) => (j === i ? { ...x, price: Number(e.target.value.replace(/\D/g, '')) } : x)))} /></label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 max-w-[260px]">
            <label htmlFor="f-new" className="label">Approximate price when new, ₹</label>
            <input id="f-new" className="field" inputMode="numeric" value={f.newPrice ?? ''} onChange={(e) => set('newPrice', num(e.target.value.replace(/\D/g, '')))} />
            <p className="hint">Used for “you save X%”. Leave empty to hide it.</p>
          </div>
        </section>

        <section className="sheet p-6" aria-label="Merchandising and search">
          <h2 className="text-[22px]">Merchandising and search</h2>
          <div className="mt-4 flex flex-wrap gap-5 text-[14px]">
            <label className="flex items-center gap-2"><input type="checkbox" className="check" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Shown in the store</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="check" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured on the home page</label>
          </div>
          {categories.length > 0 && (
            <fieldset className="mt-4">
              <legend className="label">Categories</legend>
              <div className="flex flex-wrap gap-2">{categories.map((c) => <button key={c.slug} type="button" className="chip" aria-pressed={f.categories.includes(c.slug)} onClick={() => set('categories', f.categories.includes(c.slug) ? f.categories.filter((x) => x !== c.slug) : [...f.categories, c.slug])}>{c.name}</button>)}</div>
            </fieldset>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="f-tags" className="label">Tags</label><input id="f-tags" className="field" value={f.tags} onChange={(e) => set('tags', e.target.value)} placeholder="thunderbolt, backlit, 16:10" /><p className="hint">Comma-separated. Searchable.</p></div>
            <div className="sm:col-span-2"><label htmlFor="f-specs" className="label">Extra specifications</label><textarea id="f-specs" className="field" value={f.specs} onChange={(e) => set('specs', e.target.value)} placeholder={'Battery: 57 Wh\nWebcam: 720p with shutter'} /><p className="hint">One per line, as Name: value. Shown in the specification table.</p></div>
            <div><label htmlFor="f-seot" className="label">Search title (optional)</label><input id="f-seot" className="field" maxLength={70} value={f.seoTitle ?? ''} onChange={(e) => set('seoTitle', e.target.value || null)} /></div>
            <div><label htmlFor="f-seod" className="label">Search description (optional)</label><input id="f-seod" className="field" maxLength={170} value={f.seoDescription ?? ''} onChange={(e) => set('seoDescription', e.target.value || null)} /></div>
          </div>
        </section>

        {error && <p className="rounded-2xl bg-alert-soft px-4 py-3 text-alert" role="alert">{error}</p>}
        <button type="button" className="btn btn-primary btn-lg" disabled={pending} onClick={save}>{pending ? 'Saving…' : initial.id ? 'Save changes' : 'Add laptop'}</button>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <section className="sheet p-5" aria-label="Drawing">
          <h2 className="text-[18px]">Drawing</h2>
          <p className="hint !mt-1">Shown when there are no photos.</p>
          <div className="mt-3 rounded-2xl bg-bench p-3"><LaptopArt art={{ style: f.style, colour: f.colour, notch: f.notch }} brand={f.brand} slug={slug || 'preview'} /></div>
          <div className="mt-2 rounded-2xl bg-bench p-3"><LidMarks colour={f.colour} grade="excellent" brand={f.brand} className="w-full" /></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select aria-label="Outline" className="field" value={f.style} onChange={(e) => set('style', e.target.value as Form['style'])}>{STYLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <select aria-label="Colour" className="field" value={f.colour} onChange={(e) => set('colour', e.target.value as Form['colour'])}>{COLOURS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[14px]"><input type="checkbox" className="accent-[var(--color-spruce)]" checked={f.notch} onChange={(e) => set('notch', e.target.checked)} />Camera notch</label>
        </section>

        <section className="sheet p-5" aria-label="Photos">
          <h2 className="text-[18px]">Photos</h2>
          {!initial.id ? <p className="hint">Add the laptop first, then upload photos.</p> : (
            <>
              <p className="hint !mt-1">The first photo leads on the product page and the catalogue card.</p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {photos.map((ph, i) => (
                  <li key={ph.src} className="relative overflow-hidden rounded-xl bg-bench">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.src} alt={ph.alt} className="aspect-[4/3] w-full object-cover" />
                    <div className="absolute inset-x-1 bottom-1 flex justify-between">
                      <span className="flex gap-1">
                        <button type="button" className="rounded-lg bg-white/90 p-1.5 text-spruce disabled:opacity-40" disabled={i === 0 || uploading} onClick={() => movePhoto(i, -1)} aria-label="Move earlier"><ArrowUp size={14} /></button>
                        <button type="button" className="rounded-lg bg-white/90 p-1.5 text-spruce disabled:opacity-40" disabled={i === photos.length - 1 || uploading} onClick={() => movePhoto(i, 1)} aria-label="Move later"><ArrowDown size={14} /></button>
                      </span>
                      <button type="button" className="rounded-lg bg-white/90 p-1.5 text-alert" disabled={uploading} aria-label="Remove photo"
                        onClick={() => { const next = photos.filter((_, j) => j !== i); setPhotos(next); startUpload(async () => { await arrangePhotos(initial.id!, next); toast('Photo removed'); }); }}><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <form className="mt-3" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set('id', initial.id!);
                const formEl = e.currentTarget;
                startUpload(async () => {
                  const r = await uploadPhotos(fd);
                  if (!r.ok) { toast(r.error, 'error'); return; }
                  setPhotos(r.images); formEl.reset(); toast('Photos added');
                });
              }}>
                <label htmlFor="photos" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-bench px-3 py-4 text-[14px] font-semibold text-spruce hover:border-spruce">
                  <Upload size={16} /> Choose photos
                </label>
                <input id="photos" name="photos" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.currentTarget.form?.requestSubmit()} />
                {uploading && <p className="hint">Uploading…</p>}
              </form>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
