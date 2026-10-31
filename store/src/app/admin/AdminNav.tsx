'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, FileText, GraduationCap, History, LifeBuoy, Mail, MessageSquareQuote, Package, RotateCcw, Settings, Shield, Tags, Ticket, Users, Laptop, Bell } from 'lucide-react';

type Badges = { students: number; tickets: number; requests: number; orders: number; reviews: number };
const GROUPS: { title: string; items: { href: string; label: string; icon: typeof Package; perm?: string; badge?: keyof Badges }[] }[] = [
  { title: '', items: [{ href: '/admin', label: 'Overview', icon: BarChart3 }] },
  { title: 'Sales', items: [
    { href: '/admin/orders', label: 'Orders', icon: Package, perm: 'orders.view', badge: 'orders' },
    { href: '/admin/returns', label: 'Returns and warranty', icon: RotateCcw, perm: 'service.manage', badge: 'requests' },
    { href: '/admin/customers', label: 'Customers', icon: Users, perm: 'customers.view' },
    { href: '/admin/coupons', label: 'Coupons', icon: Ticket, perm: 'coupons.manage' },
  ] },
  { title: 'Catalogue', items: [
    { href: '/admin/inventory', label: 'Inventory units', icon: Boxes, perm: 'inventory.manage' },
    { href: '/admin/products', label: 'Laptop models', icon: Laptop, perm: 'catalogue.manage' },
    { href: '/admin/catalogue', label: 'Brands and categories', icon: Tags, perm: 'catalogue.manage' },
  ] },
  { title: 'Customers', items: [
    { href: '/admin/tickets', label: 'Support tickets', icon: LifeBuoy, perm: 'tickets.manage', badge: 'tickets' },
    { href: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote, perm: 'reviews.moderate', badge: 'reviews' },
    { href: '/admin/students', label: 'Student IDs', icon: GraduationCap, perm: 'students.review', badge: 'students' },
  ] },
  { title: 'Content', items: [
    { href: '/admin/content', label: 'Pages and blog', icon: FileText, perm: 'content.manage' },
    { href: '/admin/newsletter', label: 'Newsletter', icon: Mail, perm: 'newsletter.view' },
  ] },
  { title: 'System', items: [
    { href: '/admin/notifications', label: 'Notifications', icon: Bell, perm: 'notifications.manage' },
    { href: '/admin/staff', label: 'Staff and roles', icon: Shield, perm: 'staff.manage' },
    { href: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings.manage' },
    { href: '/admin/audit', label: 'Audit log', icon: History, perm: 'audit.view' },
  ] },
];

export default function AdminNav({ perms, badges }: { perms: Record<string, boolean>; badges: Badges }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="px-3 pb-4">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.perm || perms[i.perm]);
        if (!items.length) return null;
        return (
          <div key={g.title || 'top'} className="mt-3">
            {g.title && <p className="mono px-3 pb-1.5 pt-2 text-[10.5px] uppercase tracking-[0.1em] text-white/40">{g.title}</p>}
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: I, badge }) => {
                const on = href === '/admin' ? path === href : path.startsWith(href);
                const n = badge ? badges[badge] : 0;
                return (
                  <li key={href}>
                    <Link href={href} aria-current={on ? 'page' : undefined}
                      className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-[14px] transition ${on ? 'bg-white/12 font-semibold text-white' : 'hover:bg-white/6 hover:text-white'}`}>
                      <I size={16} aria-hidden="true" /> <span className="flex-1">{label}</span>
                      {n > 0 && <span className="mono rounded-md bg-accent px-1.5 text-[11px] font-semibold text-ink">{n}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
