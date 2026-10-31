'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, GraduationCap, Heart, Home, LayoutDashboard, LifeBuoy, LogOut, MapPin, Package, RotateCcw, Settings, ShieldCheck } from 'lucide-react';
import { signOut } from '../login/actions';

const ITEMS = [
  ['/account', 'Overview', LayoutDashboard],
  ['/account/orders', 'Orders', Package],
  ['/account/requests', 'Returns and repairs', RotateCcw],
  ['/account/warranty', 'Warranty', ShieldCheck],
  ['/account/wishlist', 'Wishlist', Heart],
  ['/account/recent', 'Recently viewed', Clock],
  ['/account/addresses', 'Addresses', MapPin],
  ['/account/support', 'Support', LifeBuoy],
  ['/account/profile', 'Profile and security', Settings],
  ['/students', 'Student discount', GraduationCap],
] as const;

export default function AccountNav({ staff }: { staff: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="mt-5">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {ITEMS.map(([href, label, Icon]) => {
          const on = href === '/account' ? path === href : path.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[14.5px] transition ${on ? 'bg-ink font-semibold text-white' : 'text-ink-2 hover:bg-canvas'}`}>
                <Icon size={17} aria-hidden="true" /> {label}
              </Link>
            </li>
          );
        })}
        {staff && <li className="shrink-0"><Link href="/admin" className="flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[14.5px] text-ink-2 hover:bg-canvas"><Home size={17} aria-hidden="true" /> Admin</Link></li>}
        <li className="shrink-0">
          <form action={signOut}><button className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[14.5px] text-mute hover:bg-canvas hover:text-ink"><LogOut size={17} aria-hidden="true" /> Sign out</button></form>
        </li>
      </ul>
    </nav>
  );
}
