import Link from 'next/link';
import Logo from './Logo';
import { BRAND, CONTACT, LEGAL, POLICY, STUDENT, whatsappLink } from '@/lib/config';
import { formatPhone } from '@/lib/format';

const COLS = [
  {
    title: 'Shop',
    links: [
      ['All laptops', '/laptops'],
      ['MacBooks', '/laptops?brand=Apple'],
      ['ThinkPads', '/laptops?brand=Lenovo'],
      ['Under ₹30,000', '/laptops?max=30000'],
      ['For coding', '/laptops?use=code'],
      [`Students, ${STUDENT.percent}% off`, '/students'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['Track an order', '/track'],
      ['Warranty', '/warranty'],
      ['Returns and refunds', '/returns'],
      ['Shipping', '/shipping'],
      ['Questions', '/faq'],
      ['Contact us', '/contact'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['How we test', '/how-we-test'],
      ['About us', '/about'],
      [`For businesses: rent with ${LEGAL.rentals.name}`, LEGAL.rentals.url],
      ['Terms of sale', '/terms'],
      ['Privacy', '/privacy'],
    ],
  },
] as const;

export default function Footer() {
  return (
    <footer className="mt-24 bg-spruce text-white/80">
      <div className="wrap grid gap-12 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="max-w-[340px]">
          <Logo tone="light" />
          <p className="mt-4 text-[15px] leading-relaxed">
            Business laptops and MacBooks, tested on every part, graded honestly and covered for {POLICY.warrantyMonths} months. Delivered free across India.
          </p>
          <div className="mt-6 space-y-1.5 text-[15px]">
            <p><a className="hover:text-white" href={`tel:${CONTACT.phone}`}>{formatPhone(CONTACT.phone)}</a></p>
            <p><a className="hover:text-white" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></p>
            <p><a className="hover:text-white" href={whatsappLink()} target="_blank" rel="noopener">WhatsApp us</a></p>
            <p className="text-white/60">{CONTACT.hours}</p>
          </div>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 0 }}>{c.title}</h2>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  {href.startsWith('http')
                    ? <a href={href} className="hover:text-white" target="_blank" rel="noopener">{label}</a>
                    : <Link href={href} className="hover:text-white">{label}</Link>}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-3 py-6 text-[13.5px] text-white/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {LEGAL.entity}. {BRAND.name} sells refurbished laptops. Brand names belong to their owners.</p>
          <p>Payments by Razorpay: UPI, cards, net banking, wallets and EMI.</p>
        </div>
      </div>
    </footer>
  );
}
