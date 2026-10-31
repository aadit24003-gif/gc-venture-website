'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import Logo from './Logo';
import { BRAND, POLICY, STUDENT } from '@/lib/config';
import SearchDialog from './SearchDialog';
import { useCart } from './cart/CartContext';

type Viewer = { name: string | null; isStaff: boolean } | null;

const BRANDS = [
  { slug: 'lenovo', name: 'Lenovo', lines: [['ThinkPad T-series', '/laptops?brand=Lenovo&q=thinkpad%20t'], ['ThinkPad X1 Carbon', '/laptops?q=x1%20carbon'], ['ThinkPad E and L', '/laptops?brand=Lenovo&q=thinkpad%20e']] },
  { slug: 'dell', name: 'Dell', lines: [['Latitude 5000', '/laptops?brand=Dell&q=latitude%205'], ['Latitude 7000', '/laptops?brand=Dell&q=latitude%207']] },
  { slug: 'hp', name: 'HP', lines: [['EliteBook', '/laptops?brand=HP&q=elitebook'], ['ProBook', '/laptops?brand=HP&q=probook']] },
  { slug: 'apple', name: 'Apple', lines: [['MacBook Air', '/laptops?brand=Apple&q=air'], ['MacBook Pro', '/laptops?brand=Apple&q=pro']] },
] as const;

const NAV = [
  { href: '/laptops', label: 'Shop all' },
  { href: '/deals', label: 'Deals' },
  { href: '/how-we-test', label: 'Our standard' },
  { href: '/business', label: 'Business' },
];

/** The announcement bar cycles through these (the first is repeated at the end so the loop is seamless). */
const PROMISES = [
  `${POLICY.warrantyMonths}-month warranty on every laptop`,
  `${POLICY.returnDays}-day returns with free pickup`,
  `${STUDENT.percent}% off for verified students`,
  `${POLICY.warrantyMonths}-month warranty on every laptop`,
];

const QUICK = [
  ['Under ₹30,000', '/laptops?max=30000'],
  ['ThinkPad', '/laptops?q=thinkpad'],
  ['MacBook', '/brands/apple'],
  ['16 GB memory', '/laptops?ram=16'],
  ['Ultralight', '/category/ultralight'],
  ['For developers', '/category/developers'],
  ['Pristine grade', '/laptops?grade=pristine'],
  ['New arrivals', '/laptops?sort=new'],
] as const;

export default function Header({ viewer }: { viewer: Viewer }) {
  const { count, setOpen } = useCart();
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [brands, setBrands] = useState(false);
  const path = usePathname();
  const brandsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenu(false); setBrands(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setSearch(true); }
      if (e.key === 'Escape') setBrands(false);
    };
    const onClick = (e: MouseEvent) => { if (brandsRef.current && !brandsRef.current.contains(e.target as Node)) setBrands(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, []);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <div className="bg-ink text-[11px] uppercase tracking-[0.2em] text-ivory/75">
        <div className="wrap flex h-9 items-center justify-between gap-4">
          <div className="relative h-4 min-w-0 flex-1 overflow-hidden md:max-w-[440px]">
            <ul className="animate-[ticker_12s_var(--ease-lux)_infinite] motion-reduce:animate-none">
              {PROMISES.map((t, i) => <li key={i} className="flex h-4 items-center truncate leading-4" aria-hidden={i === PROMISES.length - 1 ? true : undefined}><span className="mr-2.5 inline-block h-1 w-1 rotate-45 bg-accent" aria-hidden="true" />{t}</li>)}
            </ul>
          </div>
          <div className="hidden items-center gap-7 md:flex">
            <Link href="/track" className="hover:text-ivory">Track order</Link>
            <Link href="/support" className="hover:text-ivory">Client care</Link>
            <Link href="/students" className="text-gold-hi hover:text-ivory">Students: 10% off</Link>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-line bg-ivory/90 backdrop-blur-xl supports-[backdrop-filter]:bg-ivory/80">
        <div className="wrap grid h-[76px] grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-quiet btn-icon -ml-2 xl:hidden" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={21} strokeWidth={1.5} /></button>
            <nav aria-label="Main" className="-ml-3 hidden items-center xl:flex">
              <div ref={brandsRef}>
                <button type="button" aria-expanded={brands} aria-controls="brands-menu" onClick={() => setBrands((v) => !v)}
                  className="inline-flex h-10 items-center gap-1 px-3 text-[11.5px] font-medium uppercase tracking-[0.18em] hover:text-accent-ink">
                  Brands <ChevronDown size={13} className={`transition-transform duration-300 ${brands ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {brands && (
                    <motion.div id="brands-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .35, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-x-0 top-full border-b border-line bg-ivory shadow-[var(--shadow-lift)]">
                      <div className="wrap grid grid-cols-[repeat(4,1fr)_1.2fr] gap-10 py-10">
                        {BRANDS.map((b) => (
                          <div key={b.slug}>
                            <Link href={`/brands/${b.slug}`} className="display text-[26px] hover:text-accent-ink">{b.name}</Link>
                            <ul className="mt-4 space-y-2.5 text-[14px] text-mute">
                              {b.lines.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-ink">{label}</Link></li>)}
                            </ul>
                          </div>
                        ))}
                        <div className="border-l border-line pl-10">
                          <p className="eyebrow eyebrow-gold">Shortcuts</p>
                          <ul className="mt-4 space-y-2.5 text-[14px] text-mute">
                            {QUICK.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-ink">{label}</Link></li>)}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}
                  className="relative inline-flex h-10 items-center px-3 text-[11.5px] font-medium uppercase tracking-[0.18em] hover:text-accent-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-1 aria-[current=page]:after:h-px aria-[current=page]:after:bg-accent">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link href="/" aria-label={`${BRAND.name} home`} className="shrink-0"><Logo compact /></Link>

          <div className="flex items-center justify-end gap-0.5">
            <button type="button" onClick={() => setSearch(true)} aria-label="Search"
              className="btn btn-quiet h-10 min-h-0 gap-2 px-2 text-[11.5px] tracking-[0.18em] sm:px-2.5">
              <Search size={19} strokeWidth={1.5} aria-hidden="true" /> <span className="hidden 2xl:inline">Search</span>
            </button>
            <Link href={viewer ? '/account/wishlist' : '/login?next=/account/wishlist'} className="btn btn-quiet btn-icon hidden sm:inline-flex" aria-label="Wishlist"><Heart size={19} strokeWidth={1.5} /></Link>
            <Link href={viewer ? (viewer.isStaff ? '/admin' : '/account') : '/login'} className="btn btn-quiet hidden h-10 min-h-0 gap-2 px-2.5 text-[11.5px] tracking-[0.18em] sm:inline-flex" aria-label={viewer ? 'Your account' : 'Sign in'}>
              <User size={19} strokeWidth={1.5} aria-hidden="true" />
              <span className="hidden max-w-[110px] truncate lg:inline">{viewer ? (viewer.isStaff ? 'Admin' : viewer.name?.split(' ')[0] ?? 'Account') : 'Sign in'}</span>
            </Link>
            <button type="button" onClick={() => setOpen(true)} className="btn btn-quiet relative -mr-2 h-10 min-h-0 gap-2 px-2 text-[11.5px] tracking-[0.18em] sm:mr-0 sm:px-2.5" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <ShoppingBag size={19} strokeWidth={1.5} aria-hidden="true" />
              <span className="hidden lg:inline">Bag</span>
              <span className={`num grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10.5px] tracking-normal ${count ? 'bg-ink text-ivory' : 'bg-canvas-2 text-mute'}`}>{count}</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <div className="fixed inset-0 z-[90] xl:hidden">
            <motion.button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
            <motion.nav aria-label="Menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute left-0 top-0 flex h-full w-[88%] max-w-[380px] flex-col overflow-y-auto bg-ivory p-6">
              <div className="flex items-center justify-between"><Logo compact /><button type="button" className="btn btn-quiet btn-icon" aria-label="Close menu" onClick={() => setMenu(false)}><X size={22} /></button></div>
              <ul className="mt-6">
                {[...NAV, { href: '/students', label: 'Students' }].map((n) => <li key={n.href}><Link href={n.href} className="display block border-b border-line py-3.5 text-[26px] leading-tight">{n.label}</Link></li>)}
              </ul>
              <p className="eyebrow eyebrow-gold mt-8">Brands</p>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {BRANDS.map((b) => <li key={b.slug}><Link href={`/brands/${b.slug}`} className="block border border-line px-3 py-3 text-[15px] font-medium">{b.name}</Link></li>)}
              </ul>
              <p className="eyebrow eyebrow-gold mt-8">Shortcuts</p>
              <div className="mt-2 flex flex-wrap gap-2">{QUICK.map(([label, href]) => <Link key={href} href={href} className="chip">{label}</Link>)}</div>
              <div className="mt-auto space-y-2 pt-6 text-[15px]">
                <Link href="/track" className="block px-3 py-1.5">Track an order</Link>
                <Link href="/support" className="block px-3 py-1.5">Client care</Link>
                <Link href={viewer ? '/account' : '/login'} className="btn btn-primary mt-2 w-full">{viewer ? 'Your account' : 'Sign in or create account'}</Link>
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
      <SearchDialog open={search} onClose={() => setSearch(false)} />
    </>
  );
}
