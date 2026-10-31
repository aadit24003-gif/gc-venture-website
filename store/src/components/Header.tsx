'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import Logo from './Logo';
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
  { href: '/laptops', label: 'All laptops' },
  { href: '/deals', label: 'Deals' },
  { href: '/students', label: 'Students' },
  { href: '/how-we-test', label: 'How we test' },
  { href: '/business', label: 'Business' },
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
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <div className="bg-ink text-[12.5px] text-white/80">
        <div className="wrap flex h-9 items-center justify-between gap-4">
          <p className="truncate"><span className="text-accent">●</span> Every unit inspected and listed with its measured battery health</p>
          <div className="hidden items-center gap-5 md:flex">
            <Link href="/track" className="hover:text-white">Track order</Link>
            <Link href="/support" className="hover:text-white">Help</Link>
            <Link href="/students" className="hover:text-white">10% off for students</Link>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
        <div className="wrap flex h-[68px] items-center gap-4">
          <button type="button" className="btn btn-quiet btn-icon -ml-2 lg:hidden" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={22} /></button>
          <Link href="/" aria-label="Home" className="shrink-0"><Logo /></Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            <div ref={brandsRef} className="relative">
              <button type="button" aria-expanded={brands} aria-controls="brands-menu" onClick={() => setBrands((v) => !v)}
                className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-[14.5px] font-medium hover:bg-canvas">
                Brands <ChevronDown size={15} className={`transition-transform ${brands ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <AnimatePresence>
                {brands && (
                  <motion.div id="brands-menu" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: .16 }}
                    className="absolute left-0 top-12 grid w-[640px] grid-cols-4 gap-1 rounded-2xl border border-line bg-white p-3 shadow-[var(--shadow-pop)]">
                    {BRANDS.map((b) => (
                      <div key={b.slug} className="rounded-xl p-3 hover:bg-canvas">
                        <Link href={`/brands/${b.slug}`} className="display text-[17px] font-semibold hover:underline">{b.name}</Link>
                        <ul className="mt-2 space-y-1.5 text-[13.5px] text-mute">
                          {b.lines.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-ink">{label}</Link></li>)}
                        </ul>
                      </div>
                    ))}
                    <div className="col-span-4 mt-1 flex flex-wrap gap-2 border-t border-line px-2 pt-3">
                      {QUICK.slice(3).map(([label, href]) => <Link key={href} href={href} className="chip !min-h-8 !text-[13px]">{label}</Link>)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}
                className="inline-flex h-10 items-center rounded-lg px-3 text-[14.5px] font-medium hover:bg-canvas aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:underline-offset-8">
                {n.label}
              </Link>
            ))}
          </nav>

          <button type="button" onClick={() => setSearch(true)}
            className="ml-auto hidden h-11 w-full max-w-[340px] items-center gap-2.5 rounded-xl border border-line-2 bg-canvas/60 px-3.5 text-left text-[14.5px] text-mute transition hover:border-ink md:flex">
            <Search size={17} aria-hidden="true" /> <span className="flex-1">Search ThinkPad, M1, 16 GB…</span> <span className="kbd">/</span>
          </button>

          <div className="ml-auto flex items-center gap-0.5 md:ml-2">
            <button type="button" className="btn btn-quiet btn-icon md:hidden" aria-label="Search" onClick={() => setSearch(true)}><Search size={21} /></button>
            <Link href={viewer ? '/account/wishlist' : '/login?next=/account/wishlist'} className="btn btn-quiet btn-icon hidden sm:inline-flex" aria-label="Wishlist"><Heart size={21} /></Link>
            <Link href={viewer ? (viewer.isStaff ? '/admin' : '/account') : '/login'} className="btn btn-quiet h-10 gap-2 px-2.5 text-[14px]" aria-label={viewer ? 'Your account' : 'Sign in'}>
              <User size={21} aria-hidden="true" />
              <span className="hidden max-w-[110px] truncate xl:inline">{viewer ? (viewer.isStaff ? 'Admin' : viewer.name?.split(' ')[0] ?? 'Account') : 'Sign in'}</span>
            </Link>
            <button type="button" onClick={() => setOpen(true)} className="btn btn-primary relative h-10 gap-2 px-3.5 text-[14px]" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <ShoppingBag size={18} aria-hidden="true" />
              <span className="num">{count}</span>
            </button>
          </div>
        </div>
        <div className="hidden border-t border-line lg:block">
          <div className="wrap flex h-11 items-center gap-6 overflow-x-auto text-[13.5px] text-mute">
            {QUICK.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap hover:text-ink">{label}</Link>)}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <motion.button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
            <motion.nav aria-label="Menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute left-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col overflow-y-auto bg-white p-5">
              <div className="flex items-center justify-between"><Logo /><button type="button" className="btn btn-quiet btn-icon" aria-label="Close menu" onClick={() => setMenu(false)}><X size={22} /></button></div>
              <ul className="mt-6 space-y-1">
                {NAV.map((n) => <li key={n.href}><Link href={n.href} className="block rounded-xl px-3 py-3 text-[17px] font-semibold hover:bg-canvas">{n.label}</Link></li>)}
              </ul>
              <p className="eyebrow mt-6 px-3">Brands</p>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {BRANDS.map((b) => <li key={b.slug}><Link href={`/brands/${b.slug}`} className="block rounded-xl border border-line px-3 py-3 font-semibold">{b.name}</Link></li>)}
              </ul>
              <p className="eyebrow mt-6 px-3">Shortcuts</p>
              <div className="mt-2 flex flex-wrap gap-2">{QUICK.map(([label, href]) => <Link key={href} href={href} className="chip">{label}</Link>)}</div>
              <div className="mt-auto space-y-2 pt-6 text-[15px]">
                <Link href="/track" className="block px-3 py-1.5">Track an order</Link>
                <Link href="/support" className="block px-3 py-1.5">Help and support</Link>
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
