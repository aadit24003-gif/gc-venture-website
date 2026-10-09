/**
 * Single source of truth for business details.
 * Change a value here and every page, form, schema block and CTA picks it up.
 */

export const SITE = {
  name: 'IT Rental Solutions',
  shortName: 'IT Rentals',
  domain: 'itrentals.in',
  url: 'https://itrentals.in',
  founded: 2013,
  tagline: 'IT hardware on rent for businesses across India',
  description:
    'Laptops, desktops, MacBooks, servers, networking gear and phones on rent for businesses across India. Since 2013. Delivered configured, supported until return.',
  logo: '/brand/it-rental-solutions-logo.png',
  ogImage: '/brand/og-default.png',
  /** Size and description of the default share image (public/brand/og-default.png). */
  ogImageSize: { width: 1200, height: 630 },
  ogImageAlt: 'IT Rentals: laptops and IT equipment on rent for businesses across India',
  /**
   * [REQUIRES CONFIRMATION] The company's official profiles (LinkedIn, Google Business Profile,
   * IndiaMART, etc.), as full URLs. They are added to the Organization schema as `sameAs`.
   * Leave empty until each one is confirmed to belong to the company.
   */
  sameAs: [] as string[],
} as const;

export const CONTACT = {
  PRIMARY_PHONE: '+919654750874',
  SECONDARY_PHONE: '+919999647333',
  WHATSAPP_NUMBER: '919654750874',
  PRIMARY_EMAIL: 'support@gcventure.in',
  SALES_EMAIL: 'support@gcventure.in',
  SUPPORT_EMAIL: 'support@gcventure.in',
  /** [REQUIRES CONFIRMATION] Set to e.g. 'Mon–Sat, 9:30 am – 7 pm' once confirmed. */
  BUSINESS_HOURS: null as string | null,
} as const;

/** Human-readable phone, e.g. +91 96547 50874 */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, '').slice(-10);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

export const WHATSAPP_DEFAULT_MESSAGE =
  'Hi IT Rentals, I would like to enquire about renting IT equipment.';

export function whatsappLink(message: string = WHATSAPP_DEFAULT_MESSAGE): string {
  return `https://wa.me/${CONTACT.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function productWhatsappMessage(productName: string): string {
  return `Hi IT Rentals, I am interested in renting ${productName}.`;
}

export const telLink = (e164: string = CONTACT.PRIMARY_PHONE) => `tel:${e164}`;
export const mailLink = (email: string = CONTACT.PRIMARY_EMAIL) => `mailto:${email}`;

export interface Office {
  id: string;
  city: string;
  label: string;
  lines: string[];
  locality: string;
  region: string;
  postalCode: string;
  /**
   * false = address differs between source documents; confirm before launch.
   * Only confirmed offices are added to structured data (as LocalBusiness branches).
   */
  confirmed: boolean;
  geo?: { lat: number; lng: number };
}

/** Physical offices only. Every other city is a service area. */
export const OFFICES: Office[] = [
  {
    id: 'gurgaon',
    city: 'Gurgaon',
    label: 'Gurgaon office',
    lines: ['836 A, Tower B3, Spaze iTech Park', 'Sector 49'],
    locality: 'Gurgaon',
    region: 'Haryana',
    postalCode: '122018',
    confirmed: false, // company profile says 836 A; written brief says Office 821/A
    geo: { lat: 28.4135, lng: 77.0428 },
  },
  {
    id: 'bangalore',
    city: 'Bangalore',
    label: 'Bangalore office',
    lines: ['HN 49, Royal Placid Layout', 'HSR Layout'],
    locality: 'Bengaluru',
    region: 'Karnataka',
    postalCode: '560102',
    confirmed: false, // brief lists KNA Complex, Haralur Main Road, 560068
    geo: { lat: 12.9116, lng: 77.6474 },
  },
];

/**
 * Service promises. Set `enabled: false` to remove one everywhere.
 * All are currently published at the owner's request, pending wording review.
 */
export const CLAIMS = {
  zeroDeposit: { enabled: true, short: 'Zero security deposit', long: 'No security deposit to start a rental.' },
  noLockIn: { enabled: true, short: 'No lock-in', long: 'No minimum commitment. Return devices when the work is done.' },
  fastDelivery: { enabled: true, short: 'Same or next-day delivery', long: 'Same-day or next-day delivery in the cities we serve.' },
  support247: { enabled: true, short: '24/7 support', long: 'Round-the-clock technical support while devices are with you.' },
  noAdvance: { enabled: true, short: 'No advance payment', long: 'Nothing to pay upfront before delivery.' },
  preinstalled: { enabled: true, short: 'Software pre-installed', long: 'Windows, Office and your company software set up before dispatch.' },
  monthlyBilling: { enabled: true, short: 'Billed monthly', long: 'Pay for what you use, billed at the end of each calendar month.' },
  costSaving: { enabled: true, short: 'Up to 50% lower cost', long: 'Cut IT spend by up to 50% compared with buying outright.' },
} as const;

export type ClaimKey = keyof typeof CLAIMS;
export const claim = (k: ClaimKey) => (CLAIMS[k].enabled ? CLAIMS[k] : null);
export const enabledClaims = (keys: ClaimKey[]) =>
  keys.filter((k) => CLAIMS[k].enabled).map((k) => ({ key: k, ...CLAIMS[k] }));

/** Form endpoint (PHP handler shipped in /public/api). */
export const FORM_ENDPOINT = '/api/enquiry.php';

export const ANALYTICS = {
  /** e.g. 'G-XXXXXXX'. Leave null to load no analytics script. */
  GA4_ID: null as string | null,
  /**
   * Google Search Console "HTML tag" verification: paste only the content value, e.g. 'abc123…'.
   * Not needed if the site is verified by DNS (the recommended Domain property). See SEO.md.
   */
  GOOGLE_SITE_VERIFICATION: null as string | null,
  /** Bing Webmaster Tools "HTML meta tag" verification value (msvalidate.01). Optional. */
  BING_SITE_VERIFICATION: null as string | null,
};
