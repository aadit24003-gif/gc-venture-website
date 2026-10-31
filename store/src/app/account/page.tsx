import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { GraduationCap, LogOut, MapPin, Package } from 'lucide-react';
import { requireViewer } from '@/lib/auth/session';
import { ordersForUser, STATUS } from '@/lib/orders';
import { studentStatus } from '@/lib/students';
import { db } from '@/lib/db';
import { addresses } from '@/lib/db/schema';
import { STUDENT } from '@/lib/config';
import { formatDate, formatPhone, rupees } from '@/lib/format';
import { signOut } from '../login/actions';
import NameForm from './NameForm';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const viewer = await requireViewer('/account');
  const u = viewer.user;
  const d = await db();
  const [orderList, student, saved, sp] = await Promise.all([
    ordersForUser(u.id),
    studentStatus(u.id),
    d.select().from(addresses).where(eq(addresses.userId, u.id)).orderBy(desc(addresses.isDefault)),
    searchParams,
  ]);

  return (
    <div className="wrap pb-10 pt-8 md:pt-12">
      {sp.notice === 'admin' && <p className="mb-6 rounded-2xl bg-alert-soft px-4 py-3 text-alert">The admin area is only for store staff.</p>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] md:text-[52px]">{u.name ? `Hello, ${u.name.split(' ')[0]}` : 'Your account'}</h1>
          <p className="mt-1 text-mute">Signed in with {u.phone ? formatPhone(u.phone) : u.email}</p>
        </div>
        <div className="flex gap-2">
          {viewer.isAdmin && <Link href="/admin" className="btn btn-tag btn-sm">Open admin</Link>}
          <form action={signOut}><button className="btn btn-ghost btn-sm"><LogOut size={16} /> Sign out</button></form>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="sheet p-6 md:p-8" aria-labelledby="orders-h">
          <h2 id="orders-h" className="flex items-center gap-2 text-[24px]"><Package size={22} /> Orders</h2>
          {orderList.length === 0 ? (
            <div className="mt-5">
              <p className="text-mute">No orders yet. When you buy a laptop, you can follow it here from packing to your door.</p>
              <Link href="/laptops" className="btn btn-primary mt-5">Browse laptops</Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {orderList.map((o) => {
                const st = STATUS[o.status] ?? { label: o.status, tone: 'wait' };
                return (
                  <li key={o.id}>
                    <Link href={`/orders/${o.number}`} className="-mx-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-4 hover:bg-bench">
                      <div className="min-w-0">
                        <p className="font-semibold text-spruce">{o.items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.title}` : i.title)).join(', ')}</p>
                        <p className="text-[14px] text-mute">{o.number}, {formatDate(o.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${st.tone === 'bad' ? 'bg-alert-soft text-alert' : st.tone === 'wait' ? 'bg-tag-soft text-spruce' : 'bg-pass-soft text-pass'}`}>{st.label}</span>
                        <span className="price text-[19px]">{rupees(o.total)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className={`rounded-[28px] p-6 ${student.state === 'approved' ? 'bg-tag' : 'bg-white'}`} aria-labelledby="student-h">
            <h2 id="student-h" className="flex items-center gap-2 text-[22px]"><GraduationCap size={22} /> Student discount</h2>
            {student.state === 'approved' && student.row?.approvedUntil && (
              <p className="mt-3 text-[15.5px]">You’re verified. {STUDENT.percent}% off applies automatically at checkout until <b>{formatDate(student.row.approvedUntil)}</b>.</p>
            )}
            {student.state === 'pending' && (
              <p className="mt-3 text-[15.5px]">We’re checking your student ID, usually within one working day. We’ll email you the result.</p>
            )}
            {student.state === 'rejected' && (
              <>
                <p className="mt-3 text-[15.5px]">We couldn’t verify your last request{student.row?.rejectReason ? `: ${student.row.rejectReason}` : '.'}</p>
                <Link href="/students#verify" className="btn btn-primary btn-sm mt-4">Try again</Link>
              </>
            )}
            {student.state === 'none' && (
              <>
                <p className="mt-3 text-[15.5px]">Verify once with your college email or ID card and save {STUDENT.percent}% on every order for a year.</p>
                <Link href="/students#verify" className="btn btn-primary btn-sm mt-4">Verify now</Link>
              </>
            )}
          </section>

          <section className="sheet p-6" aria-labelledby="profile-h">
            <h2 id="profile-h" className="text-[22px]">Profile</h2>
            <NameForm initial={u.name ?? ''} />
            <dl className="mt-4 space-y-1 text-[15px]">
              {u.phone && <div><dt className="inline text-mute">Mobile: </dt><dd className="inline">{formatPhone(u.phone)}</dd></div>}
              {u.email && <div><dt className="inline text-mute">Email: </dt><dd className="inline">{u.email}</dd></div>}
            </dl>
          </section>

          {saved.length > 0 && (
            <section className="sheet p-6" aria-labelledby="addr-h">
              <h2 id="addr-h" className="flex items-center gap-2 text-[22px]"><MapPin size={20} /> Saved addresses</h2>
              <ul className="mt-3 space-y-3 text-[14.5px]">
                {saved.map((a) => (
                  <li key={a.id} className="rounded-2xl bg-bench px-4 py-3">
                    <span className="font-semibold">{a.name}</span>{a.isDefault && <span className="ml-2 text-[12px] text-mute">default</span>}<br />
                    {a.line1}, {a.city}, {a.state} {a.pincode}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
