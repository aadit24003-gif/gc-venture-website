'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Inbox, LayoutGrid, Laptop, Package, Ticket } from 'lucide-react';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/students', label: 'Student IDs', icon: GraduationCap },
  { href: '/admin/products', label: 'Prices and stock', icon: Laptop },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/messages', label: 'Messages', icon: Inbox },
];

export default function AdminNav({ pendingStudents }: { pendingStudents: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-24 lg:self-start">
      <p className="mb-3 hidden text-[13px] font-semibold text-mute lg:block">Store admin</p>
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
        {ITEMS.map(({ href, label, icon: I }) => {
          const on = href === '/admin' ? path === href : path.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={on ? 'page' : undefined} className={`flex h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium ${on ? 'bg-spruce text-white' : 'text-ink hover:bg-white'}`}>
                <I size={18} /> {label}
                {href === '/admin/students' && pendingStudents > 0 && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[12px] font-bold ${on ? 'bg-tag text-spruce' : 'bg-tag text-spruce'}`}>{pendingStudents}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
