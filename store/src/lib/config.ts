/**
 * Single source of truth for the store's business settings.
 * Change a value here and every page, the checkout and the emails pick it up.
 *
 * Anything marked [CONFIRM] is a working default chosen during the build and
 * needs the owner's sign-off before launch (see store/README.md, "Morning checklist").
 */

export const BRAND = {
  /** Store name. Change it here only: every page, email and share image picks it up. */
  name: 'LappyClub',
  /** Two letters that start every order number (LC-261031-ABCD). */
  orderPrefix: 'LC',
  tagline: 'Imported business laptops, inspected and guaranteed',
  /** [CONFIRM] Production address of the store, without a trailing slash. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100',
  description:
    'Imported, certified refurbished Dell, HP, Lenovo and Apple laptops. Book with a small token amount, see your exact laptop on a video call, match the serial number on delivery. 12-month warranty.',
} as const;

export const CONTACT = {
  /** [CONFIRM] Shared with IT Rental Solutions for now. */
  phone: '+919654750874',
  whatsapp: '919654750874',
  email: 'support@gcventure.in',
  hours: 'Mon–Sat, 10 am – 7 pm',
} as const;

export const LEGAL = {
  /** [CONFIRM] Registered name of the selling company, shown on invoices and policies. */
  entity: 'GC Venture',
  /** [CONFIRM] GSTIN printed on invoices. */
  gstin: null as string | null,
  grievanceOfficer: { name: null as string | null, email: 'support@gcventure.in' },
  addresses: [
    { city: 'Gurgaon', lines: ['836 A, Tower B3, Spaze iTech Park', 'Sector 49, Gurgaon, Haryana 122018'] },
    { city: 'Bengaluru', lines: ['HN 49, Royal Placid Layout', 'HSR Layout, Bengaluru, Karnataka 560102'] },
  ],
  /** Sister business that rents laptops to companies. */
  rentals: { name: 'IT Rentals', url: 'https://itrentals.in' },
} as const;

export const POLICY = {
  /** [CONFIRM] Warranty included with every laptop, in months. */
  warrantyMonths: 12,
  /** [CONFIRM] Paid warranty extensions offered at checkout (price in paise). */
  warrantyExtensions: [
    { months: 12, label: 'Standard warranty', price: 0 },
    { months: 24, label: 'Extended to 2 years', price: 2_499_00 },
  ],
  /** [CONFIRM] Days after delivery within which a laptop can be returned for a refund. */
  returnDays: 10,
  /** [CONFIRM] Business days from order to dispatch. */
  dispatchDays: { min: 1, max: 2 },
  /** Delivery is free everywhere. */
  shippingFee: 0,
  /** [CONFIRM] Cash on delivery. Orders above maxOrder must be paid online. */
  cod: { enabled: true, fee: 0, maxOrder: 60_000_00 },
  /**
   * [CONFIRM] Book a laptop online for a small amount, see it on a video call, pay the rest on
   * delivery after matching the serial number. The booking amount is part of the price, not extra,
   * and is refunded in full if the order is cancelled before dispatch.
   */
  booking: { enabled: true, amount: 299_00 },
  /** [CONFIRM] Card EMI estimate shown on product pages (interest is set by the customer's bank). */
  emi: { annualRate: 0.15, tenures: [3, 6, 9, 12], minOrder: 3_000_00 },
} as const;

export const STUDENT = {
  /** Student discount, as a percentage of the laptop price. */
  percent: 10,
  /** [CONFIRM] Largest discount per laptop in paise; null means no cap. */
  maxDiscountPerUnit: null as number | null,
  /** [CONFIRM] Discounted laptops per order (stops bulk resale). */
  maxUnitsPerOrder: 1,
  /** [CONFIRM] How long a verification lasts. */
  validityMonths: 12,
  /** College email domains approved automatically after the email code is confirmed. */
  academicSuffixes: ['.ac.in', '.edu.in', '.edu', '.ernet.in', '.res.in', '.ac.uk', '.edu.au'],
  /** [CONFIRM] Extra college domains on other endings (e.g. 'christuniversity.in'); subdomains match too. */
  extraDomains: [] as string[],
  /** [CONFIRM] Days after a decision before an uploaded ID photo is deleted. */
  idRetentionDays: 30,
} as const;

/** Condition grades. Battery minimums and descriptions are promises: [CONFIRM] each one. */
export const GRADES = {
  pristine: {
    key: 'pristine',
    label: 'Pristine',
    short: 'Looks close to new',
    body: 'No visible marks from arm’s length. Keyboard and palm rest show no shine.',
    batteryMin: 85,
    tone: 'A+',
  },
  excellent: {
    key: 'excellent',
    label: 'Excellent',
    short: 'Light signs of use',
    body: 'A few hairline marks on the lid or base, only visible up close. Screen is flawless.',
    batteryMin: 80,
    tone: 'A',
  },
  good: {
    key: 'good',
    label: 'Good',
    short: 'Visible wear, priced lower',
    body: 'Noticeable scuffs or small dents on the body. Screen and keyboard have no defects.',
    batteryMin: 75,
    tone: 'B',
  },
} as const;
export type GradeKey = keyof typeof GRADES;

/** Minimums promised for every grade. [CONFIRM] */
export const CONDITION = { ssdHealthMin: 90, deadPixels: 0 } as const;
export const GRADE_ORDER: GradeKey[] = ['pristine', 'excellent', 'good'];

/** What every laptop is checked for before dispatch, grouped as on the "How we test" page. [CONFIRM] */
export const CHECKS: { group: string; items: string[] }[] = [
  { group: 'Display', items: ['Dead and stuck pixels', 'Backlight bleed and tint', 'Lines, flicker and pressure marks', 'Hinge tension through the full angle'] },
  { group: 'Battery and power', items: ['Measured health against design capacity', 'Charge cycles', 'Charging from the supplied adapter', 'Sleep, wake and lid sensor'] },
  { group: 'Keyboard and touchpad', items: ['Every key, including function row', 'Backlight on backlit models', 'Touchpad gestures and clicks', 'TrackPoint on ThinkPads'] },
  { group: 'Storage and memory', items: ['SSD health and bad sectors', 'Read and write speed', 'Memory stress test', 'Configuration matches the listing'] },
  { group: 'Ports and wireless', items: ['USB-A and USB-C data and charging', 'HDMI and display output', 'Wi-Fi and Bluetooth range', 'Headphone jack, speakers and microphone'] },
  { group: 'Camera and sensors', items: ['Webcam image and privacy shutter', 'Fingerprint reader where fitted', 'Ambient light sensor', 'Fan noise and thermals under load'] },
  { group: 'Software', items: ['Fresh, activated Windows 11 or macOS', 'Latest drivers and firmware', 'No BIOS, MDM or iCloud lock', 'Data wiped to NIST 800-88'] },
  { group: 'Body and finish', items: ['Lid, bezel, palm rest and base graded', 'Screws, feet and port covers present', 'Deep cleaned and sanitised', 'Packed with a matching charger'] },
];
export const CHECK_COUNT = CHECKS.reduce((n, g) => n + g.items.length, 0);

/** Who can open /admin. Set ADMIN_EMAILS and ADMIN_PHONES (comma-separated) in the environment. */
export function adminLists() {
  const split = (v?: string) => (v ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return { emails: split(process.env.ADMIN_EMAILS), phones: split(process.env.ADMIN_PHONES).map((p) => p.replace(/\D/g, '').slice(-10)) };
}

/**
 * Demo mode: login codes are shown on screen and payments are simulated when no
 * Razorpay keys are set. On by default in development; in production only when DEMO_MODE=1.
 */
export function isDemo(): boolean {
  if (process.env.DEMO_MODE === '1') return true;
  if (process.env.DEMO_MODE === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

export const whatsappLink = (text = `Hi ${BRAND.name}, I have a question about a laptop.`) =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
