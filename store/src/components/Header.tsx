'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import Logo from './Logo';
import { useCart } from './cart/CartContext';
import SearchDialog from './SearchDialog';
import { BRAND, STUDENT } from '@/lib/config';

const NAV = [
  { href: '/laptops', label: 'All laptops' },
  { href: '/laptops?brand=Apple', label: 'MacBooks' },
  { href: '/students', label: 'Students', tag: `${STUDENT.percent}% off` },
  { href: '/how-we-test', label: 'How we test' },
];

export default function Header({ viewer }: { viewer: { name: string | null; isAdmin: boolean } | null }) {
  const { count, setOpen, ready } = useCart();
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const [raised, setRaised] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setRaised(y > 8);
      setHidden(y > 240 && y > last.current + 4);
      if (y < last.current - 4) setHidden(false);
      last.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setMenu(false), [path]);

  const active = (href: string) => (href.includes('?') ? false : path === href || path.startsWith(href + '/'));

  return (
    <>
      <header
        className={`sticky top-0 z-50 pt-3 transition-transform duration-300 ease-[var(--ease-out-soft)] ${hidden && !menu ? '-translate-y-[110%]' : ''}`}
      >
        <a href="#main" className="btn btn-tag sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]">Skip to content</a>
        <div
          className={`wrap flex h-[62px] items-center gap-3 rounded-[20px] pl-4 pr-2 transition-[background-color,box-shadow,backdrop-filter] duration-300 md:pl-5 ${
            raised || menu ? 'bg-white/80 shadow-[0_10px_30px_-14px_rgba(15,61,51,.35)] backdrop-blur-xl backdrop-saturate-150' : 'bg-white/40 backdrop-blur-md'
          }`}
          style={{ boxShadow: raised ? undefined : 'inset 0 0 0 1px rgba(15,61,51,.08)' }}
        >
          <Link href="/" className="shrink-0 rounded-lg" aria-label={`${BRAND.name} home`}>
            <Logo />
          </Link>

          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? 'page' : undefined}
                className="relative flex h-10 items-center gap-2 rounded-xl px-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-spruce/[.06] aria-[current=page]:text-spruce aria-[current=page]:bg-spruce/[.07]"
              >
                {n.label}
                {n.tag && <span className="rounded-md bg-tag px-1.5 py-0.5 text-[12px] font-semibold leading-none text-spruce">{n.tag}</span>}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearch(true)}
              className="flex h-11 items-center gap-2 rounded-xl px-3 text-[15px] text-mute transition-colors hover:bg-spruce/[.06] hover:text-spruce md:min-w-[200px] md:bg-bench/80 md:shadow-[inset_0_0_0_1px_rgba(15,61,51,.08)]"
            >
              <Search size={19} strokeWidth={2} />
              <span className="sr-only md:not-sr-only">Search laptops</span>
              <kbd aria-hidden className="ml-auto hidden rounded-md font-sans bg-white px-1.5 py-0.5 text-[11.5px] font-medium text-mute shadow-[0_0_0_1px_rgba(15,61,51,.1)] md:inline">Ctrl K</kbd>
            </button>
            <Link
              href={viewer ? (viewer.isAdmin ? '/admin' : '/account') : '/login'}
              className="flex h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-medium text-ink transition-colors hover:bg-spruce/[.06]"
            >
              <User size={19} strokeWidth={2} aria-hidden />
              <span className="sr-only sm:not-sr-only">{viewer ? (viewer.isAdmin ? 'Admin' : viewer.name?.split(' ')[0] || 'Account') : 'Sign in'}</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative flex h-11 items-center gap-2 rounded-xl bg-spruce px-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-spruce-2"
              aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
            >
              <ShoppingBag size={19} strokeWidth={2} aria-hidden />
              <span className="num min-w-[1ch]">{ready ? count : 0}</span>
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-spruce hover:bg-spruce/[.06] lg:hidden"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-controls="mobile-menu"
              aria-label={menu ? 'Close menu' : 'Open menu'}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menu && (
            <motion.nav
              id="mobile-menu"
              aria-label="Main"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="wrap mt-2 rounded-[20px] bg-white p-2 shadow-[0_20px_40px_-18px_rgba(15,61,51,.45)] lg:hidden"
            >
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="flex min-h-[52px] items-center justify-between rounded-xl px-4 text-[17px] font-medium text-spruce hover:bg-bench">
                  {n.label}
                  {n.tag && <span className="rounded-md bg-tag px-2 py-1 text-[13px] font-semibold text-spruce">{n.tag}</span>}
                </Link>
              ))}
              <Link href="/track" className="flex min-h-[52px] items-center rounded-xl px-4 text-[17px] font-medium text-spruce hover:bg-bench">Track an order</Link>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <SearchDialog open={search} onClose={() => setSearch(false)} />
    </>
  );
}
