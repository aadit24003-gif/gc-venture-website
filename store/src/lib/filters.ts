/** Catalogue filters, shared by the shop page (server) and the filter panel (browser). */
import type { CardProduct } from './products';
import { GRADES, type GradeKey } from './config';

export const USES = [
  { key: 'study', label: 'Studying', blurb: 'Notes, assignments, online classes' },
  { key: 'code', label: 'Coding', blurb: 'IDEs, Docker, many tabs' },
  { key: 'design', label: 'Design and video', blurb: 'Sharp, colour-accurate screens' },
  { key: 'office', label: 'Office work', blurb: 'Excel, Teams, long days' },
  { key: 'travel', label: 'Light to carry', blurb: '1.35 kg or lighter' },
] as const;

export const BRANDS = ['Dell', 'HP', 'Lenovo', 'Apple'] as const;

export const BUDGETS = [
  { key: 'u25', label: 'Under ₹25,000', short: 'Under 25K', min: 0, max: 25_000 },
  { key: '25-40', label: '₹25,000–40,000', short: '25K–40K', min: 25_000, max: 40_000 },
  { key: '40-60', label: '₹40,000–60,000', short: '40K–60K', min: 40_000, max: 60_000 },
  { key: '60+', label: 'Over ₹60,000', short: '60K+', min: 60_000, max: Infinity },
] as const;

/** Processor families. */
export const CPUS = [
  { key: 'i5', label: 'Intel Core i5', test: (p: CardProduct) => p.cpuTier === 'i5' },
  { key: 'i7', label: 'Intel Core i7', test: (p: CardProduct) => p.cpuTier === 'i7' },
  { key: 'ultra', label: 'Intel Core Ultra', test: (p: CardProduct) => p.cpuTier.startsWith('ultra') },
  { key: 'apple', label: 'Apple silicon (M-series)', test: (p: CardProduct) => /^m\d/.test(p.cpuTier) },
] as const;

/** Processor generations. */
export const GENS = [
  { key: '8', label: '8th–9th Gen Intel', test: (p: CardProduct) => p.cpuGen != null && p.cpuGen <= 9 },
  { key: '10', label: '10th Gen Intel', test: (p: CardProduct) => p.cpuGen === 10 },
  { key: '11', label: '11th Gen Intel', test: (p: CardProduct) => p.cpuGen === 11 },
  { key: '12', label: '12th Gen Intel', test: (p: CardProduct) => p.cpuGen === 12 },
  { key: '13', label: '13th Gen Intel', test: (p: CardProduct) => p.cpuGen === 13 },
  { key: 'ultra', label: 'Core Ultra (Series 1)', test: (p: CardProduct) => p.cpuGen === 15 },
  { key: 'm1', label: 'Apple M1 family', test: (p: CardProduct) => p.cpuTier.startsWith('m1') },
  { key: 'm2', label: 'Apple M2 family', test: (p: CardProduct) => p.cpuTier.startsWith('m2') },
  { key: 'm3', label: 'Apple M3 family', test: (p: CardProduct) => p.cpuTier.startsWith('m3') },
] as const;

export const RAMS = [8, 16, 32] as const;
export const SSDS = [
  { key: '256', label: '256 GB', gb: 256 },
  { key: '512', label: '512 GB', gb: 512 },
  { key: '1024', label: '1 TB', gb: 1024 },
] as const;

export const SCREENS = [
  { key: '13', label: '13–13.6″', test: (p: CardProduct) => p.screenIn < 14 },
  { key: '14', label: '14″', test: (p: CardProduct) => p.screenIn >= 14 && p.screenIn < 15 },
  { key: '15', label: '15–16″', test: (p: CardProduct) => p.screenIn >= 15 },
] as const;

export const SORTS = [
  { key: 'rec', label: 'Recommended' },
  { key: 'popular', label: 'Most popular' },
  { key: 'price-asc', label: 'Price, low to high' },
  { key: 'price-desc', label: 'Price, high to low' },
  { key: 'new', label: 'Newest arrivals' },
  { key: 'year', label: 'Newest models' },
  { key: 'discount', label: 'Biggest saving' },
] as const;

export type Filters = {
  q: string;
  brand: string[];
  category: string | null;
  use: string | null;
  budget: string | null;
  min: number | null; // rupees
  max: number | null; // rupees
  cpu: string[];
  gen: string[];
  ram: number[];
  ssd: number[];
  screen: string[];
  grade: GradeKey[];
  /** Include models with nothing on sale right now. */
  soldOut: boolean;
  sort: string;
};

export const EMPTY: Filters = { q: '', brand: [], category: null, use: null, budget: null, min: null, max: null, cpu: [], gen: [], ram: [], ssd: [], screen: [], grade: [], soldOut: false, sort: 'rec' };

type Params = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(',') : []).filter(Boolean);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export function parseFilters(sp: Params, base: Partial<Filters> = {}): Filters {
  const num = (k: string) => {
    const v = Number(one(sp[k]));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const brand = list(sp.brand).map((b) => BRANDS.find((x) => x.toLowerCase() === b.toLowerCase())).filter((b): b is (typeof BRANDS)[number] => !!b);
  return {
    q: (one(sp.q) ?? '').slice(0, 80),
    brand: brand.length ? brand : base.brand ?? [],
    category: one(sp.category) ?? base.category ?? null,
    use: USES.find((u) => u.key === one(sp.use))?.key ?? null,
    budget: BUDGETS.find((b) => b.key === one(sp.budget))?.key ?? null,
    min: num('min'),
    max: num('max'),
    cpu: list(sp.cpu).filter((c) => CPUS.some((x) => x.key === c)),
    gen: list(sp.gen).filter((c) => GENS.some((x) => x.key === c)),
    ram: list(sp.ram).map(Number).filter((r) => (RAMS as readonly number[]).includes(r)),
    ssd: list(sp.ssd).map(Number).filter((r) => SSDS.some((s) => s.gb === r)),
    screen: list(sp.screen).filter((s) => SCREENS.some((x) => x.key === s)),
    grade: list(sp.grade).filter((g): g is GradeKey => g in GRADES),
    soldOut: one(sp.soldout) === '1',
    sort: SORTS.find((s) => s.key === one(sp.sort))?.key ?? 'rec',
  };
}

export function toQuery(f: Filters, base: Partial<Filters> = {}): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.brand.length && f.brand.join() !== (base.brand ?? []).join()) p.set('brand', f.brand.join(','));
  if (f.category && f.category !== base.category) p.set('category', f.category);
  if (f.use) p.set('use', f.use);
  if (f.budget) p.set('budget', f.budget);
  if (f.min) p.set('min', String(f.min));
  if (f.max) p.set('max', String(f.max));
  if (f.cpu.length) p.set('cpu', f.cpu.join(','));
  if (f.gen.length) p.set('gen', f.gen.join(','));
  if (f.ram.length) p.set('ram', f.ram.join(','));
  if (f.ssd.length) p.set('ssd', f.ssd.join(','));
  if (f.screen.length) p.set('screen', f.screen.join(','));
  if (f.grade.length) p.set('grade', f.grade.join(','));
  if (f.soldOut) p.set('soldout', '1');
  if (f.sort !== 'rec') p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Price that matters for filtering: cheapest unit on sale in the chosen grades. */
export function priceFor(p: CardProduct, grades: GradeKey[]) {
  const pool = p.grades.filter((g) => g.price != null && (grades.length ? grades.includes(g.grade) : true) && (g.stock > 0 || !p.inStock));
  return pool.length ? Math.min(...pool.map((g) => g.price as number)) : p.fromPrice;
}

export function applyFilters(items: CardProduct[], f: Filters): CardProduct[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const budget = BUDGETS.find((b) => b.key === f.budget);
  const out = items.filter((p) => {
    if (!f.soldOut && !p.inStock) return false;
    if (f.brand.length && !f.brand.includes(p.brand)) return false;
    if (f.category && !p.categories.includes(f.category)) return false;
    if (f.use && !p.uses.includes(f.use)) return false;
    const price = priceFor(p, f.grade) / 100;
    if (budget && (price < budget.min || price >= budget.max)) return false;
    if (f.min && price < f.min) return false;
    if (f.max && price > f.max) return false;
    if (f.cpu.length && !CPUS.filter((c) => f.cpu.includes(c.key)).some((c) => c.test(p))) return false;
    if (f.gen.length && !GENS.filter((c) => f.gen.includes(c.key)).some((c) => c.test(p))) return false;
    // memory: either a unit has it, or it can be upgraded to it
    if (f.ram.length && !f.ram.some((r) => p.ramOn.includes(r) || p.maxRamGb >= r)) return false;
    if (f.ssd.length && !f.ssd.some((s) => p.ssdOn.includes(s))) return false;
    if (f.screen.length && !SCREENS.filter((s) => f.screen.includes(s.key)).some((s) => s.test(p))) return false;
    if (f.grade.length && !p.grades.some((g) => f.grade.includes(g.grade) && (g.stock > 0 || f.soldOut))) return false;
    if (words.length) {
      const hay = `${p.title} ${p.family} ${p.cpu} ${p.cpuShort} ${p.ramGb}gb ${p.ramGb} gb ${p.year} ${p.tags.join(' ')}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const saved = (p: CardProduct) => (p.newPrice ? (p.newPrice - priceFor(p, f.grade)) / p.newPrice : 0);
  const by = {
    rec: (a: CardProduct, b: CardProduct) => Number(b.inStock) - Number(a.inStock) || Number(b.featured) - Number(a.featured) || b.popularity - a.popularity || a.sort - b.sort,
    popular: (a: CardProduct, b: CardProduct) => Number(b.inStock) - Number(a.inStock) || b.popularity - a.popularity || a.sort - b.sort,
    'price-asc': (a: CardProduct, b: CardProduct) => priceFor(a, f.grade) - priceFor(b, f.grade),
    'price-desc': (a: CardProduct, b: CardProduct) => priceFor(b, f.grade) - priceFor(a, f.grade),
    new: (a: CardProduct, b: CardProduct) => (b.newestListing ?? '').localeCompare(a.newestListing ?? '') || (b.year ?? 0) - (a.year ?? 0),
    year: (a: CardProduct, b: CardProduct) => (b.year ?? 0) - (a.year ?? 0) || priceFor(a, f.grade) - priceFor(b, f.grade),
    discount: (a: CardProduct, b: CardProduct) => saved(b) - saved(a),
  }[f.sort] ?? (() => 0);
  return out.sort(by);
}

export function activeCount(f: Filters, base: Partial<Filters> = {}) {
  return (f.brand.join() !== (base.brand ?? []).join() ? f.brand.length : 0) + (f.category && f.category !== base.category ? 1 : 0) + (f.use ? 1 : 0) + (f.budget ? 1 : 0) + (f.min || f.max ? 1 : 0)
    + f.cpu.length + f.gen.length + f.ram.length + f.ssd.length + f.screen.length + f.grade.length + (f.q ? 1 : 0) + (f.soldOut ? 1 : 0);
}
