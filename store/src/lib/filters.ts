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
  { key: 'u25', label: 'Under ₹25,000', min: 0, max: 25_000 },
  { key: '25-40', label: '₹25,000–40,000', min: 25_000, max: 40_000 },
  { key: '40-60', label: '₹40,000–60,000', min: 40_000, max: 60_000 },
  { key: '60+', label: 'Over ₹60,000', min: 60_000, max: Infinity },
] as const;

export const CPUS = [
  { key: '8-9', label: 'Intel 8th–9th Gen', test: (p: CardProduct) => p.cpuGen != null && p.cpuGen <= 9 },
  { key: '10-11', label: 'Intel 10th–11th Gen', test: (p: CardProduct) => p.cpuGen === 10 || p.cpuGen === 11 },
  { key: '12+', label: 'Intel 12th Gen or newer', test: (p: CardProduct) => p.cpuGen != null && p.cpuGen >= 12 },
  { key: 'apple', label: 'Apple silicon', test: (p: CardProduct) => p.cpuGen == null },
] as const;

export const RAMS = [8, 16, 32] as const;

export const SCREENS = [
  { key: '13', label: '13″', test: (p: CardProduct) => p.screenIn < 14 },
  { key: '14', label: '14″', test: (p: CardProduct) => p.screenIn >= 14 && p.screenIn < 15 },
  { key: '15', label: '15–16″', test: (p: CardProduct) => p.screenIn >= 15 },
] as const;

export const SORTS = [
  { key: 'rec', label: 'Recommended' },
  { key: 'price-asc', label: 'Price, low to high' },
  { key: 'price-desc', label: 'Price, high to low' },
  { key: 'new', label: 'Newest models' },
] as const;

export type Filters = {
  q: string;
  brand: string[];
  use: string | null;
  budget: string | null;
  min: number | null; // rupees
  max: number | null; // rupees
  cpu: string[];
  ram: number | null;
  screen: string[];
  grade: GradeKey[];
  soldOut: boolean;
  sort: string;
};

export const EMPTY: Filters = { q: '', brand: [], use: null, budget: null, min: null, max: null, cpu: [], ram: null, screen: [], grade: [], soldOut: false, sort: 'rec' };

type Params = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(',') : []).filter(Boolean);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export function parseFilters(sp: Params): Filters {
  const num = (k: string) => {
    const v = Number(one(sp[k]));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  return {
    q: one(sp.q) ?? '',
    brand: list(sp.brand).filter((b) => (BRANDS as readonly string[]).includes(b)),
    use: USES.find((u) => u.key === one(sp.use))?.key ?? null,
    budget: BUDGETS.find((b) => b.key === one(sp.budget))?.key ?? null,
    min: num('min'),
    max: num('max'),
    cpu: list(sp.cpu).filter((c) => CPUS.some((x) => x.key === c)),
    ram: RAMS.find((r) => r === Number(one(sp.ram))) ?? null,
    screen: list(sp.screen).filter((s) => SCREENS.some((x) => x.key === s)),
    grade: list(sp.grade).filter((g): g is GradeKey => g in GRADES),
    soldOut: one(sp.soldout) === '1',
    sort: SORTS.find((s) => s.key === one(sp.sort))?.key ?? 'rec',
  };
}

export function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.brand.length) p.set('brand', f.brand.join(','));
  if (f.use) p.set('use', f.use);
  if (f.budget) p.set('budget', f.budget);
  if (f.min) p.set('min', String(f.min));
  if (f.max) p.set('max', String(f.max));
  if (f.cpu.length) p.set('cpu', f.cpu.join(','));
  if (f.ram) p.set('ram', String(f.ram));
  if (f.screen.length) p.set('screen', f.screen.join(','));
  if (f.grade.length) p.set('grade', f.grade.join(','));
  if (f.soldOut) p.set('soldout', '1');
  if (f.sort !== 'rec') p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Price that matters for filtering: cheapest in-stock grade, or within the chosen grades. */
function priceFor(p: CardProduct, grades: GradeKey[]) {
  const pool = p.grades.filter((g) => (grades.length ? grades.includes(g.grade) : true) && (g.stock > 0 || !p.inStock));
  return pool.length ? Math.min(...pool.map((g) => g.price)) : p.fromPrice;
}

export function applyFilters(items: CardProduct[], f: Filters): CardProduct[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const budget = BUDGETS.find((b) => b.key === f.budget);
  const out = items.filter((p) => {
    if (!f.soldOut && !p.inStock) return false;
    if (f.brand.length && !f.brand.includes(p.brand)) return false;
    if (f.use && !p.uses.includes(f.use)) return false;
    const price = priceFor(p, f.grade) / 100;
    if (budget && (price < budget.min || price >= budget.max)) return false;
    if (f.min && price < f.min) return false;
    if (f.max && price > f.max) return false;
    if (f.cpu.length && !CPUS.filter((c) => f.cpu.includes(c.key)).some((c) => c.test(p))) return false;
    if (f.ram && p.maxRamGb < f.ram) return false;
    if (f.screen.length && !SCREENS.filter((s) => f.screen.includes(s.key)).some((s) => s.test(p))) return false;
    if (f.grade.length && !p.grades.some((g) => f.grade.includes(g.grade) && (g.stock > 0 || f.soldOut))) return false;
    if (words.length) {
      const hay = `${p.title} ${p.family} ${p.cpuShort} ${p.ramGb} gb ${p.year}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const by = {
    rec: (a: CardProduct, b: CardProduct) => Number(b.inStock) - Number(a.inStock) || Number(b.featured) - Number(a.featured) || a.sort - b.sort,
    'price-asc': (a: CardProduct, b: CardProduct) => priceFor(a, f.grade) - priceFor(b, f.grade),
    'price-desc': (a: CardProduct, b: CardProduct) => priceFor(b, f.grade) - priceFor(a, f.grade),
    new: (a: CardProduct, b: CardProduct) => (b.year ?? 0) - (a.year ?? 0) || priceFor(a, f.grade) - priceFor(b, f.grade),
  }[f.sort] ?? (() => 0);
  return out.sort(by);
}

export function activeCount(f: Filters) {
  return f.brand.length + (f.use ? 1 : 0) + (f.budget ? 1 : 0) + (f.min || f.max ? 1 : 0) + f.cpu.length + (f.ram ? 1 : 0) + f.screen.length + f.grade.length + (f.q ? 1 : 0);
}
