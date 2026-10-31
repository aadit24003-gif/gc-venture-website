import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, inArray, sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { orders, reviews, serviceRequests, studentVerifications, tickets } from '@/lib/db/schema';
import { OPEN_SERVICE } from '@/lib/service';
import { ROLE_LABEL } from '@/lib/rbac';
import { isDemo } from '@/lib/config';
import Logo from '@/components/Logo';
import AdminNav from './AdminNav';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const v = await requireStaff('dashboard.view');
  const d = await db();
  const count = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [students, open, requests, toShip, pendingReviews] = await Promise.all([
    count(d.select({ n: sql<number>`count(*)::int` }).from(studentVerifications).where(eq(studentVerifications.status, 'pending'))),
    count(d.select({ n: sql<number>`count(*)::int` }).from(tickets).where(eq(tickets.status, 'open'))),
    count(d.select({ n: sql<number>`count(*)::int` }).from(serviceRequests).where(inArray(serviceRequests.status, OPEN_SERVICE))),
    count(d.select({ n: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, ['confirmed', 'quality_check', 'packed']))),
    count(d.select({ n: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.status, 'pending'))),
  ]);
  const perms = Object.fromEntries((['orders.view', 'service.manage', 'customers.view', 'coupons.manage', 'inventory.manage', 'catalogue.manage', 'tickets.manage', 'reviews.moderate', 'students.review', 'content.manage', 'newsletter.view', 'notifications.manage', 'staff.manage', 'settings.manage', 'audit.view', 'analytics.view'] as const).map((p) => [p, v.can(p)]));
  return (
    <div className="grid min-h-dvh lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="bg-ink text-white/70 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-5"><Link href="/admin" aria-label="Admin home"><Logo tone="light" /></Link><Link href="/" className="text-[12.5px] text-white/60 hover:text-white">Store ↗</Link></div>
        <AdminNav perms={perms} badges={{ students, tickets: open, requests, orders: toShip, reviews: pendingReviews }} />
        <div className="border-t border-white/10 px-5 py-4 text-[12.5px]">
          <p className="truncate text-white">{v.user.name ?? v.user.email ?? v.user.phone}</p>
          <p className="text-white/50">{ROLE_LABEL[v.role]}</p>
        </div>
      </aside>
      <div className="min-w-0 bg-canvas">
        {isDemo() && <p className="bg-accent px-6 py-1.5 text-[12.5px] font-medium text-ink">Demo mode: sample units (serials start with DEMO-), simulated payments.</p>}
        <main id="main" className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
