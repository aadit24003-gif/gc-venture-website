/**
 * Equipment inventory. Add, edit or remove models here; the catalogue,
 * filters, product pages, sitemap and schema update automatically.
 *
 * Models below are the ones listed on the previous site. Their availability
 * is 'on-request' until current stock is confirmed. Do not mark a model
 * 'in-stock' unless it is genuinely available.
 */

import { LAPTOP_ROWS } from './laptop-catalogue';
import { MACBOOK_AIR, MACBOOK_PRO } from './mac-lineup';

export type Availability = 'in-stock' | 'limited' | 'on-request';

/**
 * One processor or chip option for a model. The configuration picker shows the
 * groups first (processor, or generation for Macs), then the chip when a group
 * has several, then screen, memory and storage for the chosen option.
 */
export interface Config {
  group: string;          // "Core i5 · 8th Gen", "M3"
  chip: string;           // "Intel Core i5 (8th Gen)", "Apple M3 Pro"
  year?: string;
  screens?: string[];     // ['14"'] or ['14.2"', '16.2"']
  ram: number[];          // GB, smallest first; the first is the standard size
  storage: number[];      // GB, smallest first
  storageType?: string;   // "SSD", "NVMe SSD"
  family?: string[];      // for filters: ["Core i5"]
  gen?: string;           // for filters: "8th Gen", "Core Ultra", "M3"
}
export type ProcessorBrand = 'Intel' | 'AMD' | 'Apple';

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: 'laptops' | 'macbooks' | 'desktops' | 'monitors';
  subcategory?: string;
  processor?: string;            // "Core i5 / i7"
  processor_brand?: ProcessorBrand;
  processor_generation?: string[]; // ["8th Gen"] or ["M1", "M2"]
  processor_family?: string[];   // ["Core i5", "Core i7"] for filtering
  ram?: string;                  // "8 GB"
  ram_gb?: number;
  storage?: string;              // "256 GB SSD"
  storage_gb?: number;
  display_size?: string;         // '14"'
  resolution?: string;
  gpu?: string;
  operating_system?: string;
  battery?: string;
  ports?: string;
  weight?: string;
  condition?: string;
  availability: Availability;
  rental_price?: number | null;  // ₹ per month. null = quote only
  rental_period?: string;
  city_availability?: string[];  // city ids; empty = all served cities
  featured?: boolean;
  tags: string[];
  /** src: 1200×900 (product page), card: 800×500 (cards). Photos are representative of the model family. */
  images: { src: string; card?: string; alt: string; width: number; height: number; credit?: string }[];
  description: string;
  use_cases: string[];
  seo_title?: string;
  seo_description?: string;
  /** Selectable configurations. Laptops and Macs have these; the first group is shown first. */
  configs?: Config[];
  /** Index into configs selected when the page opens. */
  defaultConfig?: number;
  /** Name of the first picker step: "Processor" or "Generation". */
  configLabel?: string;
}

/**
 * Representative photos. HP, Dell and Mac photos were supplied by IT Rental Solutions;
 * the rest are from Pexels (free for commercial use, no attribution required).
 * Replace with your own photos of actual stock when available.
 */
const PHOTOS = {
  thinkpad: { file: 'lenovo-thinkpad', credit: 'https://www.pexels.com/photo/3550482/', what: 'Lenovo ThinkPad laptop' },
  lenovo: { file: 'lenovo-laptop', credit: 'https://www.pexels.com/photo/9229975/', what: 'Lenovo business laptop' },
  dell: { file: 'dell-laptop-studio', credit: 'Supplied by IT Rental Solutions', what: 'Dell laptop' },
  hp: { file: 'hp-laptop-studio', credit: 'Supplied by IT Rental Solutions', what: 'HP laptop' },
  mac: { file: 'macbook-air-lifestyle', credit: 'Supplied by IT Rental Solutions', what: 'Apple MacBook' },
  imac: { file: 'apple-imac', credit: 'https://www.pexels.com/photo/41227/', what: 'Apple iMac on a desk' },
  desktops: { file: 'office-desktops', credit: 'https://www.pexels.com/photo/990423/', what: 'Row of office desktop computers' },
  seat: { file: 'monitor-keyboard-desk', credit: 'https://www.pexels.com/photo/1714341/', what: 'Desktop seat with monitor and keyboard' },
  monitor: { file: 'monitor-office', credit: 'https://www.pexels.com/photo/8297860/', what: 'Office monitor on a desk' },
  monitorDual: { file: 'monitor-dual', credit: 'https://www.pexels.com/photo/1714208/', what: 'Dual monitor setup' },
  monitorDesk: { file: 'monitor-desk', credit: 'https://www.pexels.com/photo/196658/', what: 'Monitor on a home office desk' },
} as const;

function photo(key: keyof typeof PHOTOS, productName: string) {
  const ph = PHOTOS[key];
  return [{
    src: `/products/${ph.file}-1200.webp`,
    card: `/products/${ph.file}-800.webp`,
    alt: `${productName} on rent: ${ph.what} (representative photo)`,
    width: 1200, height: 900, credit: ph.credit,
  }];
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  'in-stock': 'Available now',
  limited: 'Limited stock',
  'on-request': 'Confirm availability',
};

const MONITOR_PHOTO: Record<string, keyof typeof PHOTOS> = {
  'hp-22-monitor': 'monitor', 'hp-22f-fhd': 'monitor', 'dell-se2216h': 'monitorDual', 'lenovo-thinkvision-s22e': 'monitorDesk', 'ips-24-monitor': 'monitorDual',
};

const BASE_PRODUCTS: Product[] = [
  // ── Laptops ───────────────────────────────────────────────
  {
    id: 'thinkpad-l490', slug: 'lenovo-thinkpad-l490', name: 'Lenovo ThinkPad L490', brand: 'Lenovo',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['8th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '256 GB SSD', storage_gb: 256, display_size: '14"',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Business'], images: photo('thinkpad', 'Lenovo ThinkPad L490'),
    description: 'A dependable 14-inch ThinkPad with the keyboard and build quality Lenovo’s business line is known for. Suited to everyday office work at scale.',
    use_cases: ['BPO and support seats', 'Office productivity', 'Training batches'],
  },
  {
    id: 'thinkpad-l460', slug: 'lenovo-thinkpad-l460', name: 'Lenovo ThinkPad L460', brand: 'Lenovo',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['6th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '256 GB SSD', storage_gb: 256, display_size: '14"',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: photo('lenovo', 'Lenovo ThinkPad L460'),
    description: 'A cost-effective ThinkPad for browser-based work, email and data entry, where many identical machines are needed.',
    use_cases: ['High-volume seats', 'Exam and assessment labs', 'Temporary staff'],
  },
  {
    id: 'latitude-7490', slug: 'dell-latitude-7490', name: 'Dell Latitude 7490', brand: 'Dell',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['8th Gen'],
    ram: '16 GB', ram_gb: 16, storage: '512 GB SSD', storage_gb: 512, display_size: '14"',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Business', 'Project ready'], images: photo('dell', 'Dell Latitude 7490'),
    description: 'Dell’s premium 14-inch business laptop, available with up to 16 GB of memory for heavy multitasking and long working days.',
    use_cases: ['Analysts and consultants', 'Project teams', 'Managers'],
  },
  {
    id: 'latitude-7470', slug: 'dell-latitude-7470', name: 'Dell Latitude 7470', brand: 'Dell',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['6th Gen'],
    ram: '16 GB', ram_gb: 16, storage: '256 GB SSD', storage_gb: 256, display_size: '14"',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: photo('dell', 'Dell Latitude 7470'),
    description: 'A slim Latitude, available with up to 16 GB of memory at an accessible rental cost, for teams that keep many applications open.',
    use_cases: ['Operations teams', 'Back office', 'Training'],
  },
  {
    id: 'elitebook-840-g6', slug: 'hp-elitebook-840-g6', name: 'HP EliteBook 840 G6', brand: 'HP',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['8th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '512 GB SSD', storage_gb: 512, display_size: '14"',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Business'], images: photo('hp', 'HP EliteBook 840 G6'),
    description: 'HP’s 14-inch business flagship with 512 GB of storage, a sound choice for client-facing staff.',
    use_cases: ['Sales teams', 'Consultants', 'Office productivity'],
  },
  {
    id: 'elitebook-840-g3', slug: 'hp-elitebook-840-g3', name: 'HP EliteBook 840 G3', brand: 'HP',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['6th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '256 GB SSD', storage_gb: 256, display_size: '14"',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: photo('hp', 'HP EliteBook 840 G3'),
    description: 'A sturdy EliteBook for standard office work and large, uniform deployments.',
    use_cases: ['BPO seats', 'Data entry', 'Training batches'],
  },
  {
    id: 'elitebook-830-g6', slug: 'hp-elitebook-830-g6', name: 'HP EliteBook 830 G6', brand: 'HP',
    category: 'laptops', subcategory: 'Compact business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['8th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '512 GB SSD', storage_gb: 512, display_size: '13.3"',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: photo('hp', 'HP EliteBook 830 G6'),
    description: 'The compact 13.3-inch EliteBook, light enough for people who travel between sites.',
    use_cases: ['Field and travelling staff', 'Leadership', 'Events'],
  },
  // ── Apple ─────────────────────────────────────────────────
  {
    id: 'macbook-air', slug: 'apple-macbook-air', name: 'Apple MacBook Air', brand: 'Apple',
    category: 'macbooks', subcategory: 'MacBook Air',
    processor_brand: 'Apple', operating_system: 'macOS',
    configs: MACBOOK_AIR, defaultConfig: 2, configLabel: 'Generation',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Mac'], images: photo('mac', 'Apple MacBook Air'),
    description: 'Silent, light and long-lasting on battery. The default Mac for product, marketing and leadership teams. Choose any generation from the 2019 Intel models to the latest M5, in 13 or 15 inches.',
    use_cases: ['Product and marketing teams', 'Leadership', 'Presentations and events'],
  },
  {
    id: 'macbook-pro', slug: 'apple-macbook-pro', name: 'Apple MacBook Pro', brand: 'Apple',
    category: 'macbooks', subcategory: 'MacBook Pro',
    processor_brand: 'Apple', operating_system: 'macOS',
    configs: MACBOOK_PRO, defaultConfig: 5, configLabel: 'Generation',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Mac', 'High performance'], images: photo('mac', 'Apple MacBook Pro'),
    description: 'Sustained performance for builds, design tools and media work. Choose any generation from the 2019 Intel models to M5 Pro and M5 Max, in 13, 14 or 16 inches.',
    use_cases: ['iOS and macOS development', 'Design and video', 'Engineering contractors'],
  },
  {
    id: 'imac', slug: 'apple-imac', name: 'Apple iMac', brand: 'Apple',
    category: 'macbooks', subcategory: 'iMac',
    processor_brand: 'Apple', processor_family: ['Apple silicon'], operating_system: 'macOS',
    availability: 'on-request', rental_price: null, tags: ['Mac'], images: photo('imac', 'Apple iMac'),
    description: 'An all-in-one Mac for fixed desks, studios and reception areas. Configuration confirmed at quote.',
    use_cases: ['Design studios', 'Reception and front desk', 'Editing suites'],
  },
  // ── Desktops ──────────────────────────────────────────────
  ...([
    ['hp-desktop-mini-260', 'HP Desktop Mini 260 DM', 'HP', 'Mini PC'],
    ['thinkcentre-m75', 'Lenovo ThinkCentre M75', 'Lenovo', 'Desktop'],
    ['optiplex-3020', 'Dell OptiPlex 3020', 'Dell', 'Desktop'],
    ['optiplex-3050', 'Dell OptiPlex 3050', 'Dell', 'Desktop'],
    ['optiplex-7010-micro', 'Dell OptiPlex 7010 Micro', 'Dell', 'Mini PC'],
    ['optiplex-7040-mini', 'Dell OptiPlex 7040 Mini PC', 'Dell', 'Mini PC'],
    ['thinkcentre-mini', 'Lenovo ThinkCentre Mini', 'Lenovo', 'Mini PC'],
  ] as const).map(([id, name, brand, sub]): Product => ({
    id, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), name, brand,
    category: 'desktops', subcategory: sub, processor_brand: 'Intel',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: photo(sub === 'Mini PC' ? 'seat' : 'desktops', name),
    description: sub === 'Mini PC'
      ? `A compact ${brand} mini PC that mounts behind a monitor and frees up desk space. Rented as a full seat with monitor, keyboard and mouse. Exact processor and memory confirmed at quote.`
      : `A ${brand} business desktop for fixed workstations. Rented as a full seat with monitor, keyboard and mouse. Exact processor and memory confirmed at quote.`,
    use_cases: ['BPO and KPO floors', 'Back office', 'Training labs'],
  })),
  // ── Monitors ──────────────────────────────────────────────
  ...([
    ['hp-22-monitor', 'HP 22" Monitor', 'HP', '22"'],
    ['hp-22f-fhd', 'HP 22f FHD Monitor', 'HP', '22"'],
    ['dell-se2216h', 'Dell SE2216H', 'Dell', '22"'],
    ['lenovo-thinkvision-s22e', 'Lenovo ThinkVision S22e', 'Lenovo', '21.5"'],
    ['ips-24-monitor', '24" IPS Monitor', 'Other brands', '24"'],
  ] as const).map(([id, name, brand, size]): Product => ({
    id, slug: id, name, brand, category: 'monitors', subcategory: 'Monitor',
    display_size: size, resolution: '1920 × 1080',
    availability: 'on-request', rental_price: null, tags: [], images: photo(MONITOR_PHOTO[id] ?? 'monitorDesk', name),
    description: `A ${size} full-HD display for desks, dual-screen setups and events.`,
    use_cases: ['Dual-screen desks', 'Desktop seats', 'Events and training rooms'],
  })),
];


// ── Laptop catalogue: rows from laptop-catalogue.ts become products ─────────

const GEN_RANK: Record<string, number> = { '6th Gen': 6, '7th Gen': 7, '8th Gen': 8, '9th Gen': 9, '10th Gen': 10, '11th Gen': 11, '12th Gen': 12, '13th Gen': 13, 'Core Ultra': 20 };

/** "i5-8th Gen" → Core i5 / 8th Gen; "Core Ultra 7" → Core Ultra 7 / Core Ultra. */
function parseProcessor(raw: string) {
  const m = raw.match(/^i(\d)-(\d+)(?:st|nd|rd|th) Gen$/);
  if (m) {
    const gen = `${m[2]}th Gen`;
    return { family: `Core i${m[1]}`, gen, group: `Core i${m[1]} · ${gen}`, chip: `Intel Core i${m[1]} (${gen})` };
  }
  return { family: raw, gen: 'Core Ultra', group: raw, chip: `Intel ${raw}` };
}
const gb = (v: string) => (/TB/i.test(v) ? parseInt(v, 10) * 1024 : parseInt(v, 10));

/** Upgrades offered from the standard size; final availability is confirmed in the quote. */
function ramOptions(base: number, genRank: number) {
  if (base >= 32) return [32];
  if (base >= 16) return [16, 32];
  return genRank <= 8 ? [8, 16] : [8, 16, 32];
}
function storageOptions(base: number) {
  return [256, 512, 1024].filter((x) => x >= base).length ? [256, 512, 1024].filter((x) => x >= base) : [base];
}

/** Screen size follows each range's model numbering. */
function screenFor(brand: string, model: string): string | undefined {
  if (brand === 'Dell') {
    const n = model.match(/(\d{4})/)?.[1];
    if (!n) return undefined;
    if (n === '9450') return '14"';
    return ({ '2': '12.5"', '3': '13.3"', '4': '14"', '5': '15.6"' } as Record<string, string>)[n[1]];
  }
  if (brand === 'HP') {
    const n = model.match(/(\d{3,4})/)?.[1];
    return ({ '820': '12.5"', '830': '13.3"', '630': '13.3"', '840': '14"', '640': '14"', '440': '14"', '1040': '14"', '850': '15.6"', '860': '16"' } as Record<string, string>)[n ?? ''];
  }
  if (brand === 'Lenovo') {
    if (/X2\d0/.test(model)) return '12.5"';
    return '14"';
  }
  return undefined;
}

function rangeOf(brand: string, model: string): { sub: string; tier: 'value' | 'mainstream' | 'premium' | 'flagship' } {
  if (brand === 'Dell') {
    const n = model.match(/(\d)\d{3}/)?.[1];
    if (n === '3') return { sub: 'Entry business laptop', tier: 'value' };
    if (n === '5') return { sub: 'Mainstream business laptop', tier: 'mainstream' };
    if (n === '9') return { sub: 'Flagship business laptop', tier: 'flagship' };
    return { sub: 'Premium business laptop', tier: 'premium' };
  }
  if (brand === 'HP') {
    if (/ProBook/.test(model)) return { sub: 'Value business laptop', tier: 'value' };
    if (/1040/.test(model)) return { sub: 'Flagship business laptop', tier: 'flagship' };
    if (/EliteBook 6/.test(model)) return { sub: 'Mainstream business laptop', tier: 'mainstream' };
    return { sub: 'Premium business laptop', tier: 'premium' };
  }
  if (/X1 Carbon/.test(model)) return { sub: 'Flagship ultralight laptop', tier: 'flagship' };
  if (/ThinkPad E/.test(model)) return { sub: 'Value business laptop', tier: 'value' };
  if (/ThinkPad L/.test(model)) return { sub: 'Mainstream business laptop', tier: 'mainstream' };
  if (/ThinkPad X2/.test(model)) return { sub: 'Compact business laptop', tier: 'premium' };
  if (/ThinkPad T\d+s/.test(model)) return { sub: 'Slim premium business laptop', tier: 'premium' };
  return { sub: 'Premium business laptop', tier: 'premium' };
}

function eraCopy(rank: number, compact: boolean) {
  const base =
    rank >= 20 ? { d: 'Current-generation Intel Core Ultra with 16 GB of memory as standard, for demanding multitasking, developers and leadership.', u: ['Developers and analysts', 'Leadership and client-facing teams', 'AI-assisted and heavy multitasking work'] }
    : rank >= 12 ? { d: 'A recent-generation machine for heavier multitasking, analysts and hybrid teams.', u: ['Analysts and finance teams', 'Hybrid and project teams', 'Office productivity'] }
    : rank >= 10 ? { d: 'Fast NVMe storage and a modern processor for everyday multitasking and video calls.', u: ['Office productivity', 'Support and operations teams', 'Video calls and collaboration'] }
    : rank >= 8 ? { d: 'A dependable all-rounder for office productivity, support desks and training batches.', u: ['BPO and support seats', 'Office productivity', 'Training batches'] }
    : { d: 'A cost-effective choice for browser-based work, email and data entry where many identical machines are needed.', u: ['High-volume seats', 'Exam and assessment labs', 'Temporary staff'] };
  return compact ? { d: `${base.d} Light enough for people who move between sites.`, u: base.u } : base;
}

const PHOTO_FOR = (brand: string, tier: string): keyof typeof PHOTOS =>
  brand === 'HP' ? 'hp' : brand === 'Lenovo' ? (tier === 'value' ? 'lenovo' : 'thinkpad') : 'dell';

/** Old-site names that match a catalogue model under a different spelling. */
const ALIASES: Record<string, string> = { 'Dell Latitude E7470': 'dell-latitude-7470' };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const fmtGb = (n: number) => (n >= 1024 ? `${n / 1024} TB` : `${n} GB`);
const span = (xs: number[]) => (xs.length > 1 ? `${fmtGb(Math.min(...xs))} to ${fmtGb(Math.max(...xs))}` : fmtGb(xs[0]));

/** Fills the summary fields (used by cards, filters and search) from the configs. */
function withConfigSummary(p: Product): Product {
  const c = p.configs;
  if (!c?.length) return p;
  const rams = [...new Set(c.flatMap((x) => x.ram))].sort((a, b) => a - b);
  const stores = [...new Set(c.flatMap((x) => x.storage))].sort((a, b) => a - b);
  const screens = [...new Set(c.flatMap((x) => x.screens ?? []))].sort((a, b) => parseFloat(a) - parseFloat(b));
  const isMac = p.brand === 'Apple';
  const fams = [...new Set(c.flatMap((x) => x.family ?? (x.chip.startsWith('Apple') ? ['Apple silicon'] : ['Intel (Mac, 2019–2020)'])))];
  const gens = [...new Set(c.map((x) => x.gen ?? x.group).filter((g) => !isMac || /^M\d/.test(g)))];
  const storageType = c[0].storageType ?? 'SSD';
  return {
    ...p,
    processor: isMac ? `Apple ${gens[0]} to ${gens[gens.length - 1]}${fams.length > 1 ? ', Intel 2019–2020' : ''}` : [...new Set(c.map((x) => x.chip))].join(' / '),
    processor_family: fams,
    processor_generation: gens,
    ram: rams.length > 3 ? span(rams) : `${rams.join(' / ')} GB`,
    ram_gb: rams[0],
    storage: `${span(stores)} ${storageType}`,
    storage_gb: stores[0],
    display_size: screens.length > 1 ? `${screens[0]} to ${screens[screens.length - 1]}` : screens[0] ?? p.display_size,
  };
}

function buildCatalogue(base: Product[]): Product[] {
  const byModel = new Map<string, { brand: string; model: string; rows: typeof LAPTOP_ROWS }>();
  for (const r of LAPTOP_ROWS) {
    const k = `${r[0]} ${r[1]}`;
    if (!byModel.has(k)) byModel.set(k, { brand: r[0], model: r[1], rows: [] });
    byModel.get(k)!.rows.push(r);
  }
  const out = base.map((p) => ({ ...p }));
  for (const { brand, model, rows } of byModel.values()) {
    const name = `${brand} ${model}`;
    const screen = screenFor(brand, model);
    const configs: Config[] = rows.map(([, , proc, ram, storage]) => {
      const pp = parseProcessor(proc);
      return { group: pp.group, chip: pp.chip, family: [pp.family], gen: pp.gen, screens: screen ? [screen] : undefined, ram: ramOptions(gb(ram), GEN_RANK[pp.gen] ?? 0), storage: storageOptions(gb(storage)), storageType: storage.replace(/^[\d.]+\s*[GT]B\s*/i, '') || 'SSD' };
    });
    const slug = ALIASES[name] ?? slugify(name);
    const existing = out.find((p) => p.slug === slug);
    if (existing) { existing.configs = configs; existing.configLabel = 'Processor'; continue; }
    const rank = Math.max(...rows.map((r) => GEN_RANK[parseProcessor(r[2]).gen] ?? 0));
    const range = rangeOf(brand, model);
    const compact = !!screen && parseFloat(screen) <= 13.3;
    const copy = eraCopy(rank, compact);
    out.push({
      id: slug, slug, name, brand, category: 'laptops', subcategory: range.sub,
      processor_brand: 'Intel', configs, configLabel: 'Processor',
      availability: 'on-request', rental_price: null,
      tags: rank >= 20 ? ['Current generation'] : [],
      images: photo(PHOTO_FOR(brand, range.tier), name),
      description: `The ${name} is ${/^[AEIOU]/.test(range.sub) ? 'an' : 'a'} ${range.sub.toLowerCase()}${screen ? ` with a ${screen.replace('"', '-inch')} screen` : ''}. ${copy.d}`,
      use_cases: copy.u,
    });
  }
  // Laptops without catalogue rows still get a picker built from their listed specs.
  for (const p of out) {
    if (p.category !== 'laptops' || p.configs) continue;
    const gen = p.processor_generation?.[0] ?? '';
    const fam = p.processor_family?.join(' / ').replace(/Core /g, '').replace(/^/, 'Core ') ?? 'Intel';
    p.configs = [{ group: `${fam} · ${gen}`, chip: `Intel ${fam} (${gen})`, family: p.processor_family, gen, screens: p.display_size ? [p.display_size] : undefined, ram: ramOptions(p.ram_gb ?? 8, GEN_RANK[gen] ?? 0), storage: storageOptions(p.storage_gb ?? 256), storageType: 'SSD' }];
    p.configLabel = 'Processor';
  }
  const all = out.map(withConfigSummary);
  const rankOf = (p: Product) => Math.max(...(p.processor_generation ?? []).map((g) => GEN_RANK[g] ?? 0), 0);
  const laptops = all.filter((p) => p.category === 'laptops')
    .sort((a, b) => rankOf(b) - rankOf(a) || a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name, undefined, { numeric: true }));
  const rest = all.filter((p) => p.category !== 'laptops');
  return [...laptops, ...rest];
}

export const PRODUCTS: Product[] = buildCatalogue(BASE_PRODUCTS);

export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

/** Every memory, storage and screen size a product can be rented with. */
export const ramList = (p: Product) => (p.configs ? [...new Set(p.configs.flatMap((c) => c.ram))] : p.ram_gb ? [p.ram_gb] : []).sort((a, b) => a - b);
export const storageList = (p: Product) => (p.configs ? [...new Set(p.configs.flatMap((c) => c.storage))] : p.storage_gb ? [p.storage_gb] : []).sort((a, b) => a - b);
export const screenList = (p: Product) => (p.configs?.some((c) => c.screens?.length) ? [...new Set(p.configs.flatMap((c) => c.screens ?? []))] : p.display_size ? [p.display_size] : []);
export const formatGb = (n: number) => (n >= 1024 ? `${n / 1024} TB` : `${n} GB`);

export const genOrder = (g: string) => GEN_RANK[g] ?? (/^M(\d)/.test(g) ? 100 + Number(g.slice(1)) : 50);

/** Facets derived from data, so filters never offer an option with zero results. */
export function facets(list: Product[] = PRODUCTS) {
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
  const nums = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);
  return {
    brands: uniq(list.map((p) => p.brand)),
    processors: uniq(list.flatMap((p) => p.processor_family ?? [])),
    generations: [...new Set(list.flatMap((p) => p.processor_generation ?? []))].sort((a, b) => genOrder(a) - genOrder(b)),
    ram: nums(list.flatMap(ramList)),
    storage: nums(list.flatMap(storageList)),
    screens: [...new Set(list.flatMap(screenList))].sort((a, b) => parseFloat(a) - parseFloat(b)),
  };
}

export function specLine(p: Product): string[] {
  return [
    p.processor_family?.join(' / ') ?? p.processor,
    p.processor_generation?.join(' / '),
    p.ram,
    p.storage,
    p.display_size && `${p.display_size}${p.resolution ? ' FHD' : ''}`,
  ].filter(Boolean) as string[];
}

/** Pages with fewer than 3 known specs are kept out of search until real data is added. */
export function isThin(p: Product): boolean {
  const known = [p.processor ?? p.processor_family?.length, p.processor_generation?.length, p.ram, p.storage, p.display_size, p.gpu, p.operating_system, p.battery, p.ports, p.weight, p.condition];
  return known.filter(Boolean).length < 3;
}
