import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, LifeBuoy, MapPin, Package, ShieldCheck } from 'lucide-react';
import { requireViewer } from '@/lib/auth/session';
import { ordersForViewer } from '@/lib/orders';
import { STATUS } from '@/lib/order-status';
import { studentStatus } from '@/lib/students';
import { wishlistIds } from '@/lib/shopping';
import { reviewable } from '@/lib/reviews';
import { STUDENT } from '@/lib/config';
import { formatDate, rupees } from '@/lib/format';
import { StatusPill } from '@/components/ui/bits';
import { ResendVerification } from './profile/ProfileForms';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };

export default async function Account({ searchParams }: { searchParams: Promise<{ notice?: string; welcome?: string }> }) {
  const [v, sp] = await Promise.all([requireViewer(), searchParams]);
  const [orders, student, wished, toReview] = await Promise.all([ordersForViewer(v, 5), studentStatus(v.user.id), wishlistIds(v.user.id), reviewable(v.user.id)]);
  const active = orders.filter((o) => !['delivered', 'cancelled', 'returned'].includes(o.status));
  return (
    <div>
      {sp.welcome && <p className="mb-6 rounded-card bg-canvas p-4 text-[15px]">Welcome{v.user.name ? `, ${v.user.name.split(' ')[0]}` : ''}! Your account is ready.</p>}
      {sp.notice === 'password' && <p className="mb-6 rounded-card bg-ok-soft p-4 text-[15px] text-ok">Your new password is saved.</p>}
      {sp.notice === 'admin' && <p className="mb-6 rounded-card bg-canvas p-4 text-[15px]">That page is for staff only.</p>}
      <h1 className="text-[32px] md:text-[40px]">Hi{v.user.name ? `, ${v.user.name.split(' ')[0]}` : ''}</h1>
      {v.user.email && !v.user.emailVerifiedAt && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-accent-soft p-4 text-[14.5px]">
          <span>Confirm <b>{v.user.email}</b> so receipts reach you and you can reset your password.</span>
          <ResendVerification />
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['/account/orders', Package, 'Orders', `${active.length} in progress`],
          ['/account/warranty', ShieldCheck, 'Warranty', 'Claims and cover'],
          ['/account/wishlist', Heart, 'Wishlist', `${wished.length} saved`],
          ['/account/support', LifeBuoy, 'Support', 'Talk to us'],
        ].map(([href, I, t, s]) => {
          const Icon = I as typeof Package;
          return <Link key={href as string} href={href as string} className="card flex items-center gap-4 p-5 transition hover:border-ink"><Icon size={22} aria-hidden="true" /><span><b className="block">{t as string}</b><span className="text-[13.5px] text-mute">{s as string}</span></span></Link>;
        })}
      </div>

      <section className="card mt-6 p-6" aria-labelledby="ro-h">
        <div className="flex items-center justify-between"><h2 id="ro-h" className="text-[20px]">Recent orders</h2><Link href="/account/orders" className="text-[14px] underline">All orders</Link></div>
        {orders.length === 0 ? (
          <p className="mt-4 text-mute">No orders yet. <Link href="/laptops" className="link">Find a laptop</Link></p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.number}`} className="flex flex-wrap items-center justify-between gap-3 py-3.5 hover:opacity-80">
                  <span><b className="mono text-[14px]">{o.number}</b><span className="block text-[13.5px] text-mute">{o.items.map((i) => i.title).join(', ')} · {formatDate(o.createdAt)}</span></span>
                  <span className="flex items-center gap-3"><StatusPill label={STATUS[o.status]?.label ?? o.status} tone={STATUS[o.status]?.tone ?? 'info'} /><span className="price text-[16px]">{rupees(o.total)}</span><ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="st-h">
          <h2 id="st-h" className="text-[20px]">Student discount</h2>
          {student.state === 'approved' ? (
            <p className="mt-2 text-[15px]"><span className="pill pill-ok">Verified</span> {STUDENT.percent}% off until {formatDate(student.row?.approvedUntil)}. It applies automatically at checkout.</p>
          ) : student.state === 'pending' ? (
            <p className="mt-2 text-[15px]"><span className="pill pill-wait">Checking</span> We’re checking your ID and will email you within one working day.</p>
          ) : (
            <><p className="mt-2 text-[15px] text-mute">Get {STUDENT.percent}% off for {STUDENT.validityMonths} months with your college email or student ID.</p><Link href="/students" className="btn btn-ghost btn-sm mt-4">Verify now</Link></>
          )}
        </section>
        <section className="card p-6" aria-labelledby="rv-h">
          <h2 id="rv-h" className="text-[20px]">Reviews</h2>
          {toReview.length ? (
            <><p className="mt-2 text-[15px] text-mute">How are you finding your laptop? Your review helps other buyers.</p>
              <ul className="mt-3 space-y-2">{toReview.slice(0, 3).map((r) => <li key={r.productId}><Link href={`/orders/${r.number}#review`} className="link">Review {r.title}</Link></li>)}</ul></>
          ) : <p className="mt-2 text-[15px] text-mute">Nothing to review right now. You can review laptops after they’re delivered.</p>}
        </section>
      </div>
      <p className="mt-6 flex items-center gap-2 text-[14px] text-mute"><MapPin size={15} aria-hidden="true" /> <Link href="/account/addresses" className="underline">Manage delivery addresses</Link></p>
    </div>
  );
}
