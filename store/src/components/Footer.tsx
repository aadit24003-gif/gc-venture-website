import Link from 'next/link';
import { BRAND, CHECK_COUNT, LEGAL, POLICY, STUDENT } from '@/lib/config';
import { getSettings } from '@/lib/settings';
import { formatPhone } from '@/lib/format';
import Logo from './Logo';
import NewsletterForm from './NewsletterForm';

const COLS: { title: string; links: [string, string][] }[] = [
  { title: 'Shop', links: [['All laptops', '/laptops'], ['Lenovo ThinkPad', '/brands/lenovo'], ['Dell Latitude', '/brands/dell'], ['HP EliteBook', '/brands/hp'], ['Apple MacBook', '/brands/apple'], ['Deals', '/deals'], ['Compare', '/compare']] },
  { title: 'Help', links: [['Track an order', '/track'], ['Client care', '/support'], ['Returns and refunds', '/returns'], ['Warranty', '/warranty'], ['Shipping', '/shipping'], ['FAQ', '/faq']] },
  { title: 'Company', links: [['How we test', '/how-we-test'], ['About us', '/about'], ['Guides and news', '/blog'], ['Students', '/students'], ['Business orders', '/business'], ['Contact', '/contact']] },
];

export default async function Footer() {
  const s = await getSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 bg-ink text-ivory/65">
      <div className="wrap border-b border-ivory/10 py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <p data-reveal="lines" className="display max-w-[16ch] text-[40px] leading-[1.02] text-ivory md:text-[64px]">
            <span className="line"><span>Restored with rigour.</span></span>
            <span className="line"><span><em className="text-gold-hi">Guaranteed</em> in writing.</span></span>
          </p>
          <div className="max-w-[440px]">
            <p className="eyebrow !text-gold-hi">The private list</p>
            <p className="mt-3 text-[15px] leading-relaxed">The best units go first. Hear when new laptops are certified, at most twice a month.</p>
            <div className="mt-5"><NewsletterForm /></div>
          </div>
        </div>
      </div>
      <div className="wrap grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-6 max-w-[38ch] text-[14.5px] leading-relaxed">Certified pre-owned business laptops and MacBooks. Every unit inspected on {CHECK_COUNT} points, sold with its own measured condition report and a {POLICY.warrantyMonths}-month warranty.</p>
          <ul className="mt-8 grid max-w-[400px] grid-cols-2 gap-x-6 gap-y-3 text-[12.5px] uppercase tracking-[0.14em] text-ivory/55">
            {[`${POLICY.warrantyMonths}-month warranty`, `${POLICY.returnDays}-day returns`, 'GST invoice', 'Secure payments'].map((t) => (
              <li key={t} className="flex items-center gap-2.5"><span className="h-1 w-1 rotate-45 bg-accent" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="eyebrow !text-gold-hi">{c.title}</p>
              <ul className="mt-5 space-y-3 text-[14px]">
                {c.links.map(([label, href]) => <li key={href}><Link href={href} className="transition-colors hover:text-ivory">{label}</Link></li>)}
              </ul>
            </nav>
          ))}
          <div>
            <p className="eyebrow !text-gold-hi">Client care</p>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><a href={`tel:${s.business.phone}`} className="hover:text-ivory">{formatPhone(s.business.phone)}</a></li>
              <li><a href={`https://wa.me/${s.business.whatsapp}`} className="hover:text-ivory" target="_blank" rel="noopener">WhatsApp</a></li>
              <li><a href={`mailto:${s.business.email}`} className="break-all hover:text-ivory">{s.business.email}</a></li>
              <li className="text-ivory/45">{s.business.hours}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="wrap flex flex-col gap-4 py-7 text-[12.5px] md:flex-row md:items-center md:justify-between">
          <p>© {year} {s.business.legalName}{s.business.gstin ? ` · GSTIN ${s.business.gstin}` : ''}. {BRAND.name} is not affiliated with Dell, HP, Lenovo or Apple; product photos are the manufacturers’.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2 uppercase tracking-[0.14em] text-[11px]">
            <Link href="/terms" className="hover:text-ivory">Terms</Link>
            <Link href="/privacy" className="hover:text-ivory">Privacy</Link>
            <Link href="/returns" className="hover:text-ivory">Refunds</Link>
            <Link href="/grievance" className="hover:text-ivory">Grievance officer</Link>
            <a href={LEGAL.rentals.url} className="hover:text-ivory" target="_blank" rel="noopener">Renting? {LEGAL.rentals.name}</a>
          </nav>
        </div>
        <p className="wrap pb-7 text-[12px] text-ivory/40">Payments secured by Razorpay: UPI, cards, net banking, wallets and EMI. Card details never reach our servers. {STUDENT.percent}% off for verified students.</p>
      </div>
    </footer>
  );
}
