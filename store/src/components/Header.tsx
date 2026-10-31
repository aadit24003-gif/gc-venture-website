'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, Menu, Search, ShoppingBag, User, Video, X } from 'lucide-react';
import { rupees } from '@/lib/format';
import Logo from './Logo';
import { BRAND } from '@/lib/config';
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
  { href: '/laptops', label: 'Shop' },
  { href: '/brands/lenovo', label: 'Lenovo' },
  { href: '/brands/dell', label: 'Dell' },
  { href: '/brands/hp', label: 'HP' },
  { href: '/brands/apple', label: 'MacBook' },
  { href: '/deals', label: 'Deals' },
  { href: '/students', label: 'Students' },
  { href: '/how-we-test', label: 'How we check' },
  { href: '/support', label: 'Support' },
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

export default function Header({ viewer, bookingAmount = null }: { viewer: Viewer; /** paise; null when booking is off */ bookingAmount?: number | null }) {
  const { count, setOpen } = useCart();
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const path = usePathname();

  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const icon = 'grid h-11 w-11 place-items-center rounded-full text-white/85 transition-colors hover:text-white';
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-50 bg-black/95 text-white backdrop-blur-xl supports-[backdrop-filter]:bg-black/85">
        <div className="wrap flex h-14 items-center gap-2">
          <button type="button" className={`${icon} -ml-3 lg:hidden`} aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={20} /></button>
          <Link href="/" aria-label={`${BRAND.name} home`} className="shrink-0"><Logo tone="light" compact /></Link>
          <nav aria-label="Main" className="mx-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] transition-colors hover:text-white aria-[current=page]:text-white ${n.href === '/deals' ? 'text-gold-hi' : 'text-white/75'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center lg:ml-0">
            <button type="button" className={icon} aria-label="Search" onClick={() => setSearch(true)}><Search size={19} /></button>
            <Link href={viewer ? '/account/wishlist' : '/login?next=/account/wishlist'} className={`${icon} hidden sm:grid`} aria-label="Wishlist"><Heart size={19} /></Link>
            <Link href={viewer ? (viewer.isStaff ? '/admin' : '/account') : '/login'} className={`${icon} hidden sm:grid`} aria-label={viewer ? (viewer.isStaff ? 'Admin' : 'Your account') : 'Sign in'} title={viewer ? (viewer.isStaff ? 'Admin' : viewer.name ?? 'Account') : 'Sign in'}><User size={19} /></Link>
            <button type="button" onClick={() => setOpen(true)} className={`${icon} relative -mr-2`} aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <ShoppingBag size={19} aria-hidden="true" />
              {count > 0 && <span className="num absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">{count}</span>}
            </button>
          </div>
        </div>
      </header>
      <div className="border-b border-white/10 bg-[#0f0f11] text-center text-[14px] text-white/75">
        <p className="wrap flex flex-wrap items-center justify-center gap-x-2 py-2.5">
          <Video size={15} className="hidden text-accent sm:block" aria-hidden="true" />
          <span>{bookingAmount != null ? <>Book any laptop for <b className="text-white">{rupees(bookingAmount)}</b>. See it on a video call, pay the rest on delivery.</> : 'See your exact laptop on a video call before it ships.'}</span>
          <Link href="/#how" className="font-semibold text-gold-hi hover:underline">How it works ›</Link>
        </p>
      </div>

      <AnimatePresence>
        {menu && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <motion.button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
            <motion.nav aria-label="Menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute left-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col overflow-y-auto bg-white p-5">
              <div className="flex items-center justify-between"><Logo compact /><button type="button" className="btn btn-quiet btn-icon" aria-label="Close menu" onClick={() => setMenu(false)}><X size={22} /></button></div>
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
