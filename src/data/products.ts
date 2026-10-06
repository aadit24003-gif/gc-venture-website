/**
 * Equipment inventory. Add, edit or remove models here; the catalogue,
 * filters, product pages, sitemap and schema update automatically.
 *
 * Models below are the ones listed on the previous site. Their availability
 * is 'on-request' until current stock is confirmed. Do not mark a model
 * 'in-stock' unless it is genuinely available.
 */

export type Availability = 'in-stock' | 'limited' | 'on-request';
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
  images: { src: string; alt: string; width: number; height: number }[];
  description: string;
  use_cases: string[];
  seo_title?: string;
  seo_description?: string;
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  'in-stock': 'Available now',
  limited: 'Limited stock',
  'on-request': 'Confirm availability',
};

export const PRODUCTS: Product[] = [
  // ── Laptops ───────────────────────────────────────────────
  {
    id: 'thinkpad-l490', slug: 'lenovo-thinkpad-l490', name: 'Lenovo ThinkPad L490', brand: 'Lenovo',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['8th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '256 GB SSD', storage_gb: 256, display_size: '14"',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Business'], images: [],
    description: 'A dependable 14-inch ThinkPad with the keyboard and build quality Lenovo’s business line is known for. Suited to everyday office work at scale.',
    use_cases: ['BPO and support seats', 'Office productivity', 'Training batches'],
  },
  {
    id: 'thinkpad-l460', slug: 'lenovo-thinkpad-l460', name: 'Lenovo ThinkPad L460', brand: 'Lenovo',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['6th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '256 GB SSD', storage_gb: 256, display_size: '14"',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: [],
    description: 'A cost-effective ThinkPad for browser-based work, email and data entry, where many identical machines are needed.',
    use_cases: ['High-volume seats', 'Exam and assessment labs', 'Temporary staff'],
  },
  {
    id: 'latitude-7490', slug: 'dell-latitude-7490', name: 'Dell Latitude 7490', brand: 'Dell',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['8th Gen'],
    ram: '16 GB', ram_gb: 16, storage: '512 GB SSD', storage_gb: 512, display_size: '14"',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Business', 'Project ready'], images: [],
    description: 'Dell’s premium 14-inch business laptop with 16 GB of memory, comfortable for heavy multitasking and long working days.',
    use_cases: ['Analysts and consultants', 'Project teams', 'Managers'],
  },
  {
    id: 'latitude-7470', slug: 'dell-latitude-7470', name: 'Dell Latitude 7470', brand: 'Dell',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['6th Gen'],
    ram: '16 GB', ram_gb: 16, storage: '256 GB SSD', storage_gb: 256, display_size: '14"',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: [],
    description: 'A slim Latitude with 16 GB of memory at an accessible rental cost, for teams that keep many applications open.',
    use_cases: ['Operations teams', 'Back office', 'Training'],
  },
  {
    id: 'elitebook-840-g6', slug: 'hp-elitebook-840-g6', name: 'HP EliteBook 840 G6', brand: 'HP',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['8th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '512 GB SSD', storage_gb: 512, display_size: '14"',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Business'], images: [],
    description: 'HP’s 14-inch business flagship with 512 GB of storage, a sound choice for client-facing staff.',
    use_cases: ['Sales teams', 'Consultants', 'Office productivity'],
  },
  {
    id: 'elitebook-840-g3', slug: 'hp-elitebook-840-g3', name: 'HP EliteBook 840 G3', brand: 'HP',
    category: 'laptops', subcategory: 'Business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['6th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '256 GB SSD', storage_gb: 256, display_size: '14"',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: [],
    description: 'A sturdy EliteBook for standard office work and large, uniform deployments.',
    use_cases: ['BPO seats', 'Data entry', 'Training batches'],
  },
  {
    id: 'elitebook-830-g6', slug: 'hp-elitebook-830-g6', name: 'HP EliteBook 830 G6', brand: 'HP',
    category: 'laptops', subcategory: 'Compact business laptop',
    processor: 'Intel Core i5 / i7', processor_brand: 'Intel', processor_family: ['Core i5', 'Core i7'], processor_generation: ['8th Gen'],
    ram: '8 GB', ram_gb: 8, storage: '512 GB SSD', storage_gb: 512, display_size: '13.3"',
    availability: 'on-request', rental_price: null, tags: ['Business'], images: [],
    description: 'The compact 13.3-inch EliteBook, light enough for people who travel between sites.',
    use_cases: ['Field and travelling staff', 'Leadership', 'Events'],
  },
  // ── Apple ─────────────────────────────────────────────────
  {
    id: 'macbook-air', slug: 'apple-macbook-air', name: 'Apple MacBook Air', brand: 'Apple',
    category: 'macbooks', subcategory: 'MacBook Air',
    processor: 'Apple M1 / M2', processor_brand: 'Apple', processor_family: ['Apple silicon'], processor_generation: ['M1', 'M2'],
    ram: '8 GB', ram_gb: 8, storage: '256 GB SSD', storage_gb: 256, display_size: '13.3"', operating_system: 'macOS',
    availability: 'on-request', rental_price: null, featured: true, tags: ['Mac'], images: [],
    description: 'Silent, light and long-lasting on battery. The default Mac for product, marketing and leadership teams.',
    use_cases: ['Product and marketing teams', 'Leadership', 'Presentations and events'],
  },
  {
    id: 'macbook-pro', slug: 'apple-macbook-pro', name: 'Apple MacBook Pro', brand: 'Apple',
    category: 'macbooks', subcategory: 'MacBook Pro',
    processor: 'Apple M1 / M2', processor_brand: 'Apple', processor_family: ['Apple silicon'], processor_generation: ['M1', 'M2'],
    ram: '8 GB', ram_gb: 8, storage: '256 GB SSD', storage_gb: 256, display_size: '13.3"', operating_system: 'macOS',
    availability: 'on-request', rental_price: null, tags: ['Mac', 'High performance'], images: [],
    description: 'Sustained performance for builds, design tools and media work. Ask about higher-memory configurations.',
    use_cases: ['iOS and macOS development', 'Design and video', 'Engineering contractors'],
  },
  {
    id: 'imac', slug: 'apple-imac', name: 'Apple iMac', brand: 'Apple',
    category: 'macbooks', subcategory: 'iMac',
    processor_brand: 'Apple', processor_family: ['Apple silicon'], operating_system: 'macOS',
    availability: 'on-request', rental_price: null, tags: ['Mac'], images: [],
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
    availability: 'on-request', rental_price: null, tags: ['Business'], images: [],
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
    availability: 'on-request', rental_price: null, tags: [], images: [],
    description: `A ${size} full-HD display for desks, dual-screen setups and events.`,
    use_cases: ['Dual-screen desks', 'Desktop seats', 'Events and training rooms'],
  })),
];

export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

/** Facets derived from data, so filters never offer an option with zero results. */
export function facets(list: Product[] = PRODUCTS) {
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
  return {
    brands: uniq(list.map((p) => p.brand)),
    processors: uniq(list.flatMap((p) => p.processor_family ?? [])),
    generations: uniq(list.flatMap((p) => p.processor_generation ?? [])),
    ram: [...new Set(list.map((p) => p.ram_gb).filter(Boolean) as number[])].sort((a, b) => a - b),
    storage: [...new Set(list.map((p) => p.storage_gb).filter(Boolean) as number[])].sort((a, b) => a - b),
    screens: uniq(list.map((p) => p.display_size)),
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
