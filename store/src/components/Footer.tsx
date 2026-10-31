import Link from 'next/link';
import { BRAND, LEGAL, POLICY, STUDENT } from '@/lib/config';
import { getSettings } from '@/lib/settings';
import { formatPhone } from '@/lib/format';
import Logo from './Logo';
import NewsletterForm from './NewsletterForm';

const COLS: { title: string; links: [string, string][] }[] = [
  { title: 'Shop', links: [['All laptops', '/laptops'], ['Lenovo ThinkPad', '/brands/lenovo'], ['Dell Latitude', '/brands/dell'], ['HP EliteBook', '/brands/hp'], ['Apple MacBook', '/brands/apple'], ['Deals', '/deals'], ['Compare', '/compare']] },
  { title: 'Help', links: [['Track an order', '/track'], ['Help centre', '/support'], ['Returns and refunds', '/returns'], ['Warranty', '/warranty'], ['Shipping', '/shipping'], ['FAQ', '/faq']] },
  { title: 'Company', links: [['How we test', '/how-we-test'], ['About us', '/about'], ['Guides and news', '/blog'], ['Students', '/students'], ['Business orders', '/business'], ['Contact', '/contact']] },
];

export default async function Footer() {
  const s = await getSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-ink text-white/70">
      <div className="wrap grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed">Certified refurbished business laptops and MacBooks. Every unit inspected on {32} points and listed with its own measured condition, with a {POLICY.warrantyMonths}-month warranty.</p>
          <div className="mt-8 max-w-[420px]">
            <p className="font-semibold text-white">Get new arrivals first</p>
            <p className="mt-1 text-[14px]">Good units sell quickly. We write at most twice a month.</p>
            <div className="mt-3"><NewsletterForm /></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="eyebrow !text-white/50">{c.title}</p>
              <ul className="mt-4 space-y-2.5 text-[14.5px]">
                {c.links.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-white">{label}</Link></li>)}
              </ul>
            </nav>
          ))}
          <div>
            <p className="eyebrow !text-white/50">Talk to us</p>
            <ul className="mt-4 space-y-2.5 text-[14.5px]">
              <li><a href={`tel:${s.business.phone}`} className="hover:text-white">{formatPhone(s.business.phone)}</a></li>
              <li><a href={`https://wa.me/${s.business.whatsapp}`} className="hover:text-white" target="_blank" rel="noopener">WhatsApp</a></li>
              <li><a href={`mailto:${s.business.email}`} className="break-all hover:text-white">{s.business.email}</a></li>
              <li className="text-white/50">{s.business.hours}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-4 py-6 text-[13px] md:flex-row md:items-center md:justify-between">
          <p>© {year} {s.business.legalName}{s.business.gstin ? ` · GSTIN ${s.business.gstin}` : ''}. {BRAND.name} is not affiliated with Dell, HP, Lenovo or Apple; product photos are the manufacturers’.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/returns" className="hover:text-white">Refunds</Link>
            <Link href="/grievance" className="hover:text-white">Grievance officer</Link>
            <a href={LEGAL.rentals.url} className="hover:text-white" target="_blank" rel="noopener">Renting? {LEGAL.rentals.name}</a>
          </nav>
        </div>
        <p className="wrap pb-6 text-[12.5px] text-white/45">Payments by Razorpay: UPI, cards, net banking, wallets and EMI. {STUDENT.percent}% off for verified students.</p>
      </div>
    </footer>
  );
}
