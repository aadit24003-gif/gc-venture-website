/**
 * Starting catalogue, written to the database the first time the store runs.
 * After that, prices and stock are edited in /admin/products.
 *
 * [CONFIRM] Every price here is a placeholder worked out from the processor
 * generation and model line (see `price()`); set real prices before launch.
 * "Price when new" values are approximate launch prices in India.
 */
import type { ArtSpec, UpgradeOption } from './db/schema';
import { GRADE_ORDER, type GradeKey } from './config';

type Row = {
  brand: 'Dell' | 'HP' | 'Lenovo' | 'Apple';
  family: string;
  model: string;
  year: number;
  cpu: string;
  gen: number | null; // Intel generation; 15 = Core Ultra; null = Apple silicon
  tier: string;
  gpu: string;
  screen: number;
  res: string;
  weight: number;
  ram: number;
  ssd: number;
  maxRam: number; // 0 = soldered, not upgradable
  ports: string[];
  art: ArtSpec;
  notes: string[];
  description: string;
  featured?: boolean;
  touch?: boolean;
  /** Overrides for Macs and other models priced on their own. */
  fixed?: { price: number; newPrice: number };
  line: number; // price multiplier for the model line
};

const USB = (c: number, a: number, extra: string[] = []) => [
  ...(c ? [`${c}× USB-C${c && extra.includes('tb') ? ' / Thunderbolt' : ''}`] : []),
  ...(a ? [`${a}× USB-A`] : []),
  ...extra.filter((e) => e !== 'tb'),
];

const ROWS: Row[] = [
  // ── Dell ─────────────────────────────────────────
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 5490', year: 2018, cpu: 'Intel Core i5-8350U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 14, res: 'Full HD 1920×1080', weight: 1.6, ram: 8, ssd: 256, maxRam: 32, ports: USB(1, 3, ['HDMI', 'Ethernet', 'microSD']), art: { style: 'latitude', colour: 'graphite' }, line: 1, notes: ['Two memory slots', 'Full-size Ethernet port', 'Spill-resistant keyboard'], description: 'A sturdy 14-inch workhorse with room to add memory later. Good for coursework, spreadsheets and video calls on a tight budget.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 7490', year: 2018, cpu: 'Intel Core i5-8350U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 14, res: 'Full HD 1920×1080', weight: 1.4, ram: 8, ssd: 256, maxRam: 32, ports: USB(1, 3, ['HDMI', 'Ethernet']), art: { style: 'latitude', colour: 'silver' }, line: 1.08, notes: ['Lighter 7-series chassis', 'Backlit keyboard', 'Two memory slots'], description: 'Dell’s premium business line from 2018: lighter than the 5-series, with a backlit keyboard and a crisp Full HD panel.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 7400', year: 2019, cpu: 'Intel Core i5-8365U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 14, res: 'Full HD 1920×1080', weight: 1.36, ram: 8, ssd: 256, maxRam: 32, ports: USB(2, 2, ['tb', 'HDMI']), art: { style: 'latitude', colour: 'silver' }, line: 1.1, notes: ['Thunderbolt 3', 'Narrow bezels', 'Backlit keyboard'], description: 'A compact 14-inch Latitude with thin bezels and Thunderbolt 3, so one cable can run a monitor and charge it.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 5410', year: 2020, cpu: 'Intel Core i5-10310U', gen: 10, tier: 'i5', gpu: 'Intel UHD', screen: 14, res: 'Full HD 1920×1080', weight: 1.5, ram: 8, ssd: 256, maxRam: 32, ports: USB(1, 3, ['HDMI', 'Ethernet', 'microSD']), art: { style: 'latitude', colour: 'graphite' }, line: 1, notes: ['10th Gen quad-core', 'Two memory slots', 'Webcam privacy shutter'], description: 'Four cores and a fast NVMe SSD for smooth multitasking. The webcam has a sliding privacy shutter.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 7410', year: 2020, cpu: 'Intel Core i5-10310U', gen: 10, tier: 'i5', gpu: 'Intel UHD', screen: 14, res: 'Full HD 1920×1080', weight: 1.3, ram: 8, ssd: 256, maxRam: 32, ports: USB(2, 2, ['tb', 'HDMI', 'microSD']), art: { style: 'latitude', colour: 'silver' }, line: 1.1, notes: ['Aluminium build', 'Thunderbolt 3', 'Backlit keyboard'], description: 'An aluminium 7-series that weighs 1.3 kg, with Thunderbolt 3 and a backlit keyboard for late nights.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 5420', year: 2021, cpu: 'Intel Core i5-1145G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.44, ram: 8, ssd: 256, maxRam: 32, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet']), art: { style: 'latitude', colour: 'graphite' }, line: 1, featured: true, notes: ['Iris Xe graphics', 'Thunderbolt 4', 'Two memory slots'], description: 'Iris Xe graphics handle light photo editing and an external 4K monitor with ease. Our most balanced pick for students.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 7420', year: 2021, cpu: 'Intel Core i5-1145G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.22, ram: 16, ssd: 256, maxRam: 0, ports: USB(2, 1, ['tb', 'HDMI', 'microSD']), art: { style: 'latitude', colour: 'silver' }, line: 1.1, notes: ['16 GB memory', 'Thunderbolt 4', '1.22 kg'], description: 'Light enough to carry all day, with 16 GB of memory built in for heavy browser and IDE sessions.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 5430', year: 2022, cpu: 'Intel Core i5-1245U', gen: 12, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.36, ram: 8, ssd: 256, maxRam: 32, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet']), art: { style: 'latitude', colour: 'graphite' }, line: 1, notes: ['10-core 12th Gen', 'Thunderbolt 4', 'Two memory slots'], description: 'Twelfth-generation Intel with ten cores, so builds, renders and big spreadsheets finish noticeably faster.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 7430', year: 2022, cpu: 'Intel Core i5-1245U', gen: 12, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.17, ram: 16, ssd: 512, maxRam: 0, ports: USB(2, 2, ['tb', 'HDMI']), art: { style: 'latitude', colour: 'silver' }, line: 1.1, notes: ['16 GB, 512 GB', '1.17 kg', 'Thunderbolt 4'], description: 'A light, aluminium 14-inch with 16 GB of memory and a 512 GB SSD as standard. Made for people who work on the move.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 5440', year: 2023, cpu: 'Intel Core i5-1345U', gen: 13, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.4, ram: 8, ssd: 256, maxRam: 64, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet']), art: { style: 'latitude', colour: 'graphite' }, line: 1, notes: ['13th Gen Intel', 'Thunderbolt 4', 'Up to 64 GB memory'], description: 'A recent Latitude with 13th Gen Intel and plenty of headroom: add memory now or later as your work grows.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 7440', year: 2023, cpu: 'Intel Core i5-1345U', gen: 13, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD+ 1920×1200', weight: 1.2, ram: 16, ssd: 512, maxRam: 0, ports: USB(2, 1, ['tb', 'HDMI']), art: { style: 'latitude', colour: 'silver' }, line: 1.1, notes: ['16:10 display', '16 GB, 512 GB', '1.2 kg'], description: 'A taller 16:10 screen shows more of every document. Light, quiet and fast, with 16 GB built in.' },
  { brand: 'Dell', family: 'Latitude', model: 'Latitude 5450', year: 2024, cpu: 'Intel Core Ultra 5 135U', gen: 15, tier: 'ultra5', gpu: 'Intel Graphics', screen: 14, res: 'Full HD+ 1920×1200', weight: 1.39, ram: 16, ssd: 512, maxRam: 64, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet']), art: { style: 'latitude', colour: 'graphite' }, line: 1, notes: ['Core Ultra with NPU', '16:10 display', '16 GB, 512 GB'], description: 'Intel Core Ultra brings a built-in AI engine for Windows Studio Effects and long battery life on a 16:10 screen.' },

  // ── HP ───────────────────────────────────────────
  { brand: 'HP', family: 'EliteBook', model: 'EliteBook 840 G5', year: 2018, cpu: 'Intel Core i5-8350U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 14, res: 'Full HD 1920×1080', weight: 1.48, ram: 8, ssd: 256, maxRam: 32, ports: USB(1, 2, ['HDMI', 'Docking port']), art: { style: 'elitebook', colour: 'silver' }, line: 1.03, notes: ['Aluminium body', 'Bang & Olufsen audio', 'Two memory slots'], description: 'An aluminium EliteBook with good speakers and a comfortable keyboard. Plenty for study, browsing and Office.' },
  { brand: 'HP', family: 'EliteBook', model: 'EliteBook 840 G6', year: 2019, cpu: 'Intel Core i5-8365U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 14, res: 'Full HD 1920×1080', weight: 1.48, ram: 8, ssd: 256, maxRam: 32, ports: USB(1, 2, ['HDMI']), art: { style: 'elitebook', colour: 'silver' }, line: 1.03, notes: ['Narrow bezels', 'Privacy camera shutter', 'Two memory slots'], description: 'The 2019 refresh with slimmer bezels and a camera shutter. A dependable everyday machine at an easy price.' },
  { brand: 'HP', family: 'EliteBook', model: 'EliteBook 830 G8', year: 2021, cpu: 'Intel Core i5-1145G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 13.3, res: 'Full HD 1920×1080', weight: 1.25, ram: 8, ssd: 256, maxRam: 64, ports: USB(2, 2, ['tb', 'HDMI']), art: { style: 'elitebook', colour: 'silver' }, line: 1, notes: ['13.3-inch, 1.25 kg', 'Thunderbolt 4', 'Iris Xe graphics'], description: 'A 13-inch EliteBook that fits a small backpack, with Iris Xe graphics and Thunderbolt 4 for a desk setup at home.' },
  { brand: 'HP', family: 'EliteBook', model: 'EliteBook 840 G7', year: 2020, cpu: 'Intel Core i5-10310U', gen: 10, tier: 'i5', gpu: 'Intel UHD', screen: 14, res: 'Full HD 1920×1080', weight: 1.36, ram: 8, ssd: 256, maxRam: 64, ports: USB(1, 2, ['HDMI']), art: { style: 'elitebook', colour: 'silver' }, line: 1.03, notes: ['10th Gen quad-core', 'Bang & Olufsen audio', 'Backlit keyboard'], description: 'Quad-core 10th Gen performance in a slim aluminium body, with a backlit keyboard and clear speakers.' },
  { brand: 'HP', family: 'EliteBook', model: 'EliteBook 840 G8', year: 2021, cpu: 'Intel Core i5-1145G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.33, ram: 8, ssd: 256, maxRam: 64, ports: USB(2, 2, ['tb', 'HDMI']), art: { style: 'elitebook', colour: 'silver' }, line: 1.03, featured: true, notes: ['Iris Xe graphics', 'Thunderbolt 4', 'Up to 64 GB memory'], description: 'Iris Xe graphics, Thunderbolt 4 and two memory slots in a 1.33 kg aluminium body. A favourite with developers.' },
  { brand: 'HP', family: 'ProBook', model: 'ProBook 440 G8', year: 2021, cpu: 'Intel Core i5-1135G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.38, ram: 8, ssd: 256, maxRam: 32, ports: USB(1, 2, ['HDMI', 'Ethernet']), art: { style: 'probook', colour: 'silver' }, line: 0.9, notes: ['Iris Xe graphics', 'Full-size Ethernet', 'Two memory slots'], description: 'The value pick of HP’s business range: 11th Gen Intel and Iris Xe at a price that leaves room in a student budget.' },
  { brand: 'HP', family: 'EliteBook', model: 'EliteBook 840 G9', year: 2022, cpu: 'Intel Core i5-1245U', gen: 12, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'WUXGA 1920×1200', weight: 1.36, ram: 16, ssd: 256, maxRam: 64, ports: USB(2, 2, ['tb', 'HDMI']), art: { style: 'elitebook', colour: 'silver' }, line: 1.03, notes: ['16:10 display', '16 GB memory', '5 MP camera'], description: 'A taller 16:10 screen, 16 GB of memory and a sharp 5 MP camera for interviews and online classes.' },
  { brand: 'HP', family: 'EliteBook', model: 'EliteBook 840 G10', year: 2023, cpu: 'Intel Core i5-1345U', gen: 13, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'WUXGA 1920×1200', weight: 1.36, ram: 16, ssd: 512, maxRam: 64, ports: USB(2, 2, ['tb', 'HDMI']), art: { style: 'elitebook', colour: 'silver' }, line: 1.03, notes: ['13th Gen Intel', '16 GB, 512 GB', '16:10 display'], description: 'One of the newest EliteBooks we stock: 13th Gen Intel, 16 GB, 512 GB and a 16:10 screen, at well under half its new price.' },

  // ── Lenovo ───────────────────────────────────────
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad T480', year: 2018, cpu: 'Intel Core i5-8350U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 14, res: 'Full HD 1920×1080', weight: 1.58, ram: 8, ssd: 256, maxRam: 32, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet', 'SD card']), art: { style: 'thinkpad', colour: 'black' }, line: 1.03, featured: true, notes: ['Swappable rear battery', 'Legendary keyboard', 'Two memory slots'], description: 'The ThinkPad people keep for years: a superb keyboard, every port you need and a swappable rear battery.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad T480s', year: 2018, cpu: 'Intel Core i5-8350U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 14, res: 'Full HD 1920×1080', weight: 1.32, ram: 8, ssd: 256, maxRam: 24, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet']), art: { style: 'thinkpad', colour: 'black' }, line: 1.1, notes: ['Slim at 1.32 kg', 'Thunderbolt 3', 'Fingerprint reader'], description: 'The slimmer T-series: the same keyboard and build in a 1.32 kg body, with a fingerprint reader for quick sign-in.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad X390', year: 2019, cpu: 'Intel Core i5-8365U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 13.3, res: 'Full HD 1920×1080', weight: 1.22, ram: 8, ssd: 256, maxRam: 0, ports: USB(2, 2, ['HDMI', 'microSD']), art: { style: 'thinkpad', colour: 'black' }, line: 1.05, notes: ['13.3-inch, 1.22 kg', 'Fingerprint reader', 'Full ThinkPad keyboard'], description: 'A 13-inch ThinkPad small enough for a tote bag, with a full-size keyboard. Ideal for classes and commutes.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad T490', year: 2019, cpu: 'Intel Core i5-8365U', gen: 8, tier: 'i5', gpu: 'Intel UHD 620', screen: 14, res: 'Full HD 1920×1080', weight: 1.46, ram: 8, ssd: 256, maxRam: 40, ports: USB(2, 2, ['tb', 'HDMI', 'microSD']), art: { style: 'thinkpad', colour: 'black' }, line: 1.03, notes: ['Thunderbolt 3', 'Spill-resistant keyboard', 'Webcam shutter'], description: 'A thinner T-series with a spill-resistant keyboard and ThinkShutter camera cover. Reliable for years of daily use.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad T14 Gen 1', year: 2020, cpu: 'Intel Core i5-10310U', gen: 10, tier: 'i5', gpu: 'Intel UHD', screen: 14, res: 'Full HD 1920×1080', weight: 1.46, ram: 8, ssd: 256, maxRam: 40, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet', 'microSD']), art: { style: 'thinkpad', colour: 'black' }, line: 1.03, notes: ['10th Gen quad-core', 'Full-size Ethernet', 'Webcam shutter'], description: 'The first T14: quad-core 10th Gen, every port including Ethernet, and a memory slot for later upgrades.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad L14 Gen 2', year: 2021, cpu: 'Intel Core i5-1135G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.55, ram: 8, ssd: 256, maxRam: 32, ports: USB(2, 2, ['HDMI', 'Ethernet']), art: { style: 'thinkpad', colour: 'black' }, line: 0.95, notes: ['Iris Xe graphics', 'Two memory slots', 'Full-size Ethernet'], description: 'ThinkPad build quality at a lower price, with 11th Gen Intel and Iris Xe. Easy to upgrade with two memory slots.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad T14 Gen 2', year: 2021, cpu: 'Intel Core i5-1145G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.5, ram: 8, ssd: 256, maxRam: 48, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet']), art: { style: 'thinkpad', colour: 'black' }, line: 1.03, notes: ['Thunderbolt 4', 'Iris Xe graphics', 'Memory slot for upgrades'], description: 'A versatile T14 with Thunderbolt 4 and Iris Xe. Add memory for virtual machines, Android Studio or data work.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad T14s Gen 2', year: 2021, cpu: 'Intel Core i5-1145G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.29, ram: 16, ssd: 256, maxRam: 0, ports: USB(2, 2, ['tb', 'HDMI']), art: { style: 'thinkpad', colour: 'black' }, line: 1.1, notes: ['16 GB memory', '1.29 kg', 'Thunderbolt 4'], description: 'Slim and light with 16 GB of memory built in. Carries like a 13-inch, works like a 14-inch.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad X1 Carbon Gen 9', year: 2021, cpu: 'Intel Core i5-1145G7', gen: 11, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'WUXGA 1920×1200', weight: 1.13, ram: 16, ssd: 512, maxRam: 0, ports: USB(2, 2, ['tb', 'HDMI']), art: { style: 'thinkpad', colour: 'black' }, line: 1.32, featured: true, notes: ['Carbon fibre, 1.13 kg', '16:10 display', '16 GB, 512 GB'], description: 'Lenovo’s flagship in carbon fibre at 1.13 kg, with a 16:10 screen and Dolby Atmos speakers. The one to carry everywhere.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad E14 Gen 4', year: 2022, cpu: 'Intel Core i5-1235U', gen: 12, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'Full HD 1920×1080', weight: 1.64, ram: 8, ssd: 256, maxRam: 40, ports: USB(1, 2, ['HDMI', 'Ethernet']), art: { style: 'thinkpad', colour: 'black' }, line: 0.9, notes: ['10-core 12th Gen', 'Aluminium lid', 'Memory slot'], description: 'A 12th Gen ThinkPad at an entry price: ten cores for coding and coursework, with a slot to add memory.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad T14 Gen 3', year: 2022, cpu: 'Intel Core i5-1245U', gen: 12, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'WUXGA 1920×1200', weight: 1.37, ram: 16, ssd: 256, maxRam: 48, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet']), art: { style: 'thinkpad', colour: 'black' }, line: 1.03, notes: ['16:10 display', '16 GB memory', 'Full-size Ethernet'], description: 'The T14 moved to a taller 16:10 screen in Gen 3. Sixteen gigabytes, Thunderbolt 4 and Ethernet in one body.' },
  { brand: 'Lenovo', family: 'ThinkPad', model: 'ThinkPad T14 Gen 4', year: 2023, cpu: 'Intel Core i5-1345U', gen: 13, tier: 'i5', gpu: 'Intel Iris Xe', screen: 14, res: 'WUXGA 1920×1200', weight: 1.38, ram: 16, ssd: 512, maxRam: 48, ports: USB(2, 2, ['tb', 'HDMI', 'Ethernet']), art: { style: 'thinkpad', colour: 'black' }, line: 1.03, notes: ['13th Gen Intel', '16 GB, 512 GB', '16:10 display'], description: 'A recent T14 with 13th Gen Intel and a 512 GB SSD as standard. Years of updates and performance ahead of it.' },

  // ── Apple ────────────────────────────────────────
  { brand: 'Apple', family: 'MacBook Air', model: 'MacBook Air M1', year: 2020, cpu: 'Apple M1, 8-core CPU', gen: null, tier: 'm1', gpu: '7-core GPU', screen: 13.3, res: 'Retina 2560×1600', weight: 1.29, ram: 8, ssd: 256, maxRam: 0, ports: ['2× Thunderbolt / USB 4', 'Headphone jack'], art: { style: 'macbook-air', colour: 'space-grey' }, line: 1, featured: true, fixed: { price: 44_999, newPrice: 92_900 }, notes: ['Silent, fanless', 'Up to 15 h battery when new', 'macOS updates'], description: 'The laptop that made Apple silicon famous: silent, cool and fast, with all-day battery when new. Still a superb student Mac.' },
  { brand: 'Apple', family: 'MacBook Air', model: 'MacBook Air M2', year: 2022, cpu: 'Apple M2, 8-core CPU', gen: null, tier: 'm2', gpu: '8-core GPU', screen: 13.6, res: 'Liquid Retina 2560×1664', weight: 1.24, ram: 8, ssd: 256, maxRam: 0, ports: ['MagSafe 3', '2× Thunderbolt / USB 4', 'Headphone jack'], art: { style: 'macbook-air', colour: 'midnight', notch: true }, line: 1, fixed: { price: 59_999, newPrice: 1_19_900 }, notes: ['MagSafe charging', '13.6-inch Liquid Retina', 'Fanless'], description: 'The redesigned Air with a larger 13.6-inch display, MagSafe charging and a 1080p camera, in a flat, modern body.' },
  { brand: 'Apple', family: 'MacBook Air', model: 'MacBook Air M3', year: 2024, cpu: 'Apple M3, 8-core CPU', gen: null, tier: 'm3', gpu: '8-core GPU', screen: 13.6, res: 'Liquid Retina 2560×1664', weight: 1.24, ram: 8, ssd: 256, maxRam: 0, ports: ['MagSafe 3', '2× Thunderbolt / USB 4', 'Headphone jack'], art: { style: 'macbook-air', colour: 'starlight', notch: true }, line: 1, fixed: { price: 74_999, newPrice: 1_14_900 }, notes: ['Apple Intelligence ready', 'Two external displays (lid closed)', 'Fanless'], description: 'A recent Air with the M3 chip, ready for Apple Intelligence and able to drive two external displays with the lid closed.' },
  { brand: 'Apple', family: 'MacBook Pro', model: 'MacBook Pro 13 M1', year: 2020, cpu: 'Apple M1, 8-core CPU', gen: null, tier: 'm1', gpu: '8-core GPU', screen: 13.3, res: 'Retina 2560×1600', weight: 1.4, ram: 8, ssd: 256, maxRam: 0, ports: ['2× Thunderbolt / USB 4', 'Headphone jack'], art: { style: 'macbook-pro', colour: 'silver' }, line: 1, fixed: { price: 49_999, newPrice: 1_22_900 }, notes: ['Active cooling', 'Up to 20 h battery when new', 'Touch Bar'], description: 'The M1 with a fan, so it holds full speed through long exports and builds. Excellent battery life.' },
  { brand: 'Apple', family: 'MacBook Pro', model: 'MacBook Pro 14 M1 Pro', year: 2021, cpu: 'Apple M1 Pro, 8-core CPU', gen: null, tier: 'm1pro', gpu: '14-core GPU', screen: 14.2, res: 'Liquid Retina XDR 3024×1964', weight: 1.6, ram: 16, ssd: 512, maxRam: 0, ports: ['MagSafe 3', '3× Thunderbolt 4', 'HDMI', 'SDXC', 'Headphone jack'], art: { style: 'macbook-pro', colour: 'space-grey', notch: true }, line: 1, featured: true, fixed: { price: 89_999, newPrice: 1_94_900 }, notes: ['XDR mini-LED display', 'HDMI and SD card', '16 GB, 512 GB'], description: 'A mini-LED XDR display, HDMI, SD slot and MagSafe. Built for photo, video and music work at under half the new price.' },
  { brand: 'Apple', family: 'MacBook Pro', model: 'MacBook Pro 14 M2 Pro', year: 2023, cpu: 'Apple M2 Pro, 10-core CPU', gen: null, tier: 'm2pro', gpu: '16-core GPU', screen: 14.2, res: 'Liquid Retina XDR 3024×1964', weight: 1.6, ram: 16, ssd: 512, maxRam: 0, ports: ['MagSafe 3', '3× Thunderbolt 4', 'HDMI', 'SDXC', 'Headphone jack'], art: { style: 'macbook-pro', colour: 'silver', notch: true }, line: 1, fixed: { price: 1_09_999, newPrice: 1_99_900 }, notes: ['10-core M2 Pro', 'XDR mini-LED display', 'Wi-Fi 6E'], description: 'Ten CPU cores and a 16-core GPU for 4K timelines, 3D and large code bases, with the same XDR display.' },
  { brand: 'Apple', family: 'MacBook Pro', model: 'MacBook Pro 16 (2019)', year: 2019, cpu: 'Intel Core i7-9750H, 6-core', gen: 9, tier: 'i7', gpu: 'AMD Radeon Pro 5300M 4 GB', screen: 16, res: 'Retina 3072×1920', weight: 2.0, ram: 16, ssd: 512, maxRam: 0, ports: ['4× Thunderbolt 3', 'Headphone jack'], art: { style: 'macbook-pro', colour: 'space-grey' }, line: 1, fixed: { price: 64_999, newPrice: 1_99_900 }, notes: ['16-inch Retina', 'Dedicated Radeon graphics', 'Six-speaker sound'], description: 'A big 16-inch Retina screen and dedicated Radeon graphics. Runs Windows apps natively through Boot Camp.' },
];

/* ── Pricing (placeholders, see note at the top) ──────────── */

const BASE_BY_GEN: Record<number, [price: number, newPrice: number]> = {
  8: [19_999, 95_000], 9: [24_999, 1_00_000], 10: [26_999, 1_05_000], 11: [31_999, 1_15_000],
  12: [38_999, 1_25_000], 13: [45_999, 1_35_000], 15: [61_999, 1_55_000],
};
const GRADE_FACTOR: Record<GradeKey, number> = { pristine: 1.07, excellent: 1, good: 0.92 };
/** Round to the nearest ₹500 and end in 99, e.g. 31,999. */
const tidy = (rupees: number) => Math.max(999, Math.round(rupees / 500) * 500 - 1);
const paise = (rupees: number) => rupees * 100;

/** Upgrade price list, paise. [CONFIRM] */
const RAM_PRICE: Record<number, number> = { 16: 2_500, 24: 4_500, 32: 6_500, 64: 14_000 };
const SSD_PRICE: Record<number, number> = { 512: 2_000, 1024: 5_500 };

/** Memory and storage upgrade choices for a model. maxRam 0 means memory is soldered. */
export function upgradeOptions(brand: string, ram: number, maxRam: number, ssd: number): { ramOptions: UpgradeOption[]; ssdOptions: UpgradeOption[] } {
  const ramOptions = !maxRam
    ? [{ gb: ram, price: 0 }]
    : [8, 16, 32, 64].filter((g) => g >= ram && g <= maxRam).map((gb) => ({ gb, price: gb === ram ? 0 : paise((RAM_PRICE[gb] ?? 0) - (RAM_PRICE[ram] ?? 0)) }));
  if (!ramOptions.some((o) => o.gb === ram)) ramOptions.unshift({ gb: ram, price: 0 });
  const ssdOptions = brand === 'Apple'
    ? [{ gb: ssd, price: 0 }]
    : [256, 512, 1024].filter((g) => g >= ssd).map((gb) => ({ gb, price: gb === ssd ? 0 : paise((SSD_PRICE[gb] ?? 0) - (SSD_PRICE[ssd] ?? 0)) }));
  if (!ssdOptions.some((o) => o.gb === ssd)) ssdOptions.unshift({ gb: ssd, price: 0 });
  return { ramOptions, ssdOptions };
}

/** Deterministic stock numbers so every fresh database looks the same. [CONFIRM] */
function stockFor(i: number, g: number) {
  const n = ((i + 3) * 37 + g * 11) % 9;
  return n === 0 ? 0 : n;
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function uses(r: Row, price: number): string[] {
  const u = new Set<string>(['everyday']);
  if (price <= 40_000) u.add('study');
  if ((r.gen ?? 99) >= 10 || r.brand === 'Apple') u.add('code');
  if (r.brand === 'Apple' || /XDR|Retina|1920×1200/.test(r.res)) u.add('design');
  if (r.brand !== 'Apple' || r.family === 'MacBook Pro') u.add('office');
  if (r.weight <= 1.35) u.add('travel');
  return [...u];
}

export const BRAND_INFO: { slug: string; name: string; description: string }[] = [
  { slug: 'dell', name: 'Dell', description: 'Latitude business laptops: sturdy, easy to repair and upgrade, with full-size ports on the 5-series and light aluminium bodies on the 7-series.' },
  { slug: 'hp', name: 'HP', description: 'EliteBook and ProBook business laptops: aluminium builds, good speakers and comfortable keyboards, from the value ProBook to the premium EliteBook.' },
  { slug: 'lenovo', name: 'Lenovo', description: 'ThinkPads: the keyboard people keep for years, the red TrackPoint, and builds tested against military standards.' },
  { slug: 'apple', name: 'Apple', description: 'MacBook Air and MacBook Pro with Apple silicon: silent, cool and long-lasting, with years of macOS updates ahead.' },
];

export const CATEGORY_INFO: { slug: string; name: string; description: string }[] = [
  { slug: 'business', name: 'Business laptops', description: 'Dell Latitude, HP EliteBook and Lenovo ThinkPad: built for years of daily work, with the ports offices need.' },
  { slug: 'macbooks', name: 'MacBooks', description: 'MacBook Air and Pro, Intel and Apple silicon.' },
  { slug: 'ultralight', name: 'Ultralight', description: 'At or under 1.3 kg, for carrying all day.' },
  { slug: 'student', name: 'Student picks', description: 'Reliable laptops for coursework and coding at student-friendly prices.' },
  { slug: 'developers', name: 'For developers', description: 'Fast processors and 16 GB or room to upgrade, for IDEs, containers and virtual machines.' },
  { slug: 'creators', name: 'For creators', description: 'Sharper, taller or colour-accurate screens for photo, design and video work.' },
];

/** Category slugs and tags for a model, worked out from its specs. */
export function classify(p: { brand: string; weightKg: number | null; uses: string[]; ramGb: number; maxRamGb?: number; cpuGen: number | null; screenRes: string; ports: string[]; highlights: string[]; touch: boolean }) {
  const cats = new Set<string>();
  if (p.brand === 'Apple') cats.add('macbooks'); else cats.add('business');
  if ((p.weightKg ?? 9) <= 1.3) cats.add('ultralight');
  if (p.uses.includes('study')) cats.add('student');
  if (p.uses.includes('code') && (p.ramGb >= 16 || (p.maxRamGb ?? 0) >= 32 || p.brand === 'Apple')) cats.add('developers');
  if (p.uses.includes('design')) cats.add('creators');
  const tags = new Set<string>();
  if (p.ports.some((x) => /thunderbolt|tb/i.test(x))) tags.add('thunderbolt');
  if (p.highlights.some((h) => /backlit/i.test(h)) || p.brand === 'Apple') tags.add('backlit');
  if (/1920×1200|2560×16|3024|3072|16:10/.test(p.screenRes) || p.highlights.some((h) => /16:10/.test(h))) tags.add('16:10');
  if (p.ports.some((x) => /ethernet/i.test(x))) tags.add('ethernet');
  if (p.touch) tags.add('touch');
  if ((p.cpuGen ?? 0) >= 11 || p.brand === 'Apple') tags.add('windows-11-ready');
  return { categories: [...cats], tags: [...tags] };
}

export type SeedProduct = ReturnType<typeof buildCatalogue>[number];

export function buildCatalogue() {
  return ROWS.map((r, i) => {
    const title = `${r.brand} ${r.model}`;
    const slug = slugify(title);
    const [genPrice, genNew] = r.gen ? BASE_BY_GEN[r.gen] ?? [30_000, 1_10_000] : [0, 0];
    const excellent = r.fixed ? r.fixed.price : tidy(genPrice * r.line);
    const newPrice = r.fixed ? r.fixed.newPrice : Math.round((genNew * r.line) / 1000) * 1000;
    const portsList = r.ports.map((x) => (x === 'tb' ? 'Thunderbolt' : x));
    const cpuShort = r.brand === 'Apple' ? r.cpu.split(',')[0].replace('Apple ', '') : r.cpu.replace('Intel Core ', 'Core ').replace(/-.*$/, '') + (r.gen && r.gen < 15 ? ` ${r.gen}th Gen` : '');
    return {
      product: {
        id: slug, slug, brand: r.brand, family: r.family, model: r.model, title, year: r.year,
        cpu: r.cpu, cpuShort, cpuTier: r.tier, cpuGen: r.gen, gpu: r.gpu,
        screenIn: r.screen, screenRes: r.res, touch: !!r.touch, weightKg: r.weight,
        os: r.brand === 'Apple' ? 'macOS' : 'Windows 11 Pro',
        ports: r.ports, ramGb: r.ram, ssdGb: r.ssd,
        ...upgradeOptions(r.brand, r.ram, r.maxRam, r.ssd),
        newPrice: paise(newPrice), uses: uses(r, excellent), highlights: r.notes,
        description: r.description, images: [], art: r.art,
        featured: !!r.featured, active: true, sort: i,
        ...classify({ brand: r.brand, weightKg: r.weight, uses: uses(r, excellent), ramGb: r.ram, maxRamGb: r.maxRam, cpuGen: r.gen, screenRes: r.res, ports: portsList, highlights: r.notes, touch: !!r.touch }),
      },
      variants: GRADE_ORDER.map((g, gi) => ({
        productId: slug, grade: g,
        price: paise(r.fixed ? tidy(excellent * GRADE_FACTOR[g]) : tidy(genPrice * r.line * GRADE_FACTOR[g])),
        stock: stockFor(i, gi), active: true,
      })),
    };
  });
}
