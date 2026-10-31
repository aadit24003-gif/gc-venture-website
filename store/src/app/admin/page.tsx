import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { requireStaff } from '@/lib/auth/session';
import { analytics, workQueue } from '@/lib/analytics';
import { STATUS } from '@/lib/order-status';
import { UNIT_STATUS_LABEL } from '@/lib/inventory';
import { rupees } from '@/lib/format';
import { isDemo } from '@/lib/config';
import { razorpayConfigured } from '@/lib/providers/razorpay';
import { emailConfigured } from '@/lib/providers/email';
import { getSettings } from '@/lib/settings';
import { DailyRevenue, Bars } from '@/components/admin/Charts';
import { Kpi, PageHead, Panel } from './ui';
import type { UnitStatus } from '@/lib/db/schema';

export const metadata = { title: 'Overview' };

const PRESETS = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last 12 months']] as const;
const istDate = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function range(sp: { days?: string; from?: string; to?: string }) {
  const today = istDate(new Date());
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) {
    const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : today;
    return { from: new Date(`${sp.from}T00:00:00+05:30`), to: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000), label: `${sp.from} to ${to}`, key: 'custom', fromStr: sp.from, toStr: to };
  }
  const days = Number(PRESETS.find(([k]) => k === sp.days)?.[0] ?? 30);
  const end = new Date(new Date(`${today}T00:00:00+05:30`).getTime() + 86_400_000);
  const from = new Date(end.getTime() - days * 86_400_000);
  return { from, to: end, label: PRESETS.find(([k]) => Number(k) === days)![1], key: String(days), fromStr: istDate(from), toStr: today };
}

export default async function Overview({ searchParams }: { searchParams: Promise<{ days?: string; from?: string; to?: string; notice?: string }> }) {
  const v = await requireStaff('dashboard.view');
  const sp = await searchParams;
  const r = range(sp);
  const [a, q, s] = await Promise.all([v.can('analytics.view') ? analytics(r) : Promise.resolve(null), workQueue(), getSettings()]);

  // Fill missing days with zero so the chart's time axis is continuous.
  const days: { day: string; revenue: number; orders: number }[] = [];
  if (a) {
    const span = Math.round((r.to.getTime() - r.from.getTime()) / 86_400_000);
    for (let i = 0; i < Math.min(span, 400); i++) {
      const day = istDate(new Date(r.from.getTime() + i * 86_400_000));
      const hit = a.daily.find((x) => x.day === day);
      days.push({ day, revenue: hit?.revenue ?? 0, orders: hit?.orders ?? 0 });
    }
  }
  const setup = [
    !razorpayConfigured() && 'Razorpay keys are not set: online payments are ' + (isDemo() ? 'simulated.' : 'switched off.'),
    !emailConfigured() && 'Resend is not set: emails are only written to the server log.',
    !s.business.gstin && 'No GSTIN in Settings: invoices show no GST number.',
    !process.env.AUTH_SECRET && 'AUTH_SECRET is not set (required in production).',
  ].filter(Boolean) as string[];
  const can = (p: Parameters<typeof v.can>[0]) => v.can(p);

  return (
    <div>
      <PageHead title="Overview" intro={`Signed in as ${v.user.name ?? v.user.email ?? v.user.phone}. Every number on this page comes from the database.`} />
      {sp.notice === 'forbidden' && <p className="mb-5 rounded-xl bg-warn-soft p-3 text-[14px] text-warn">Your role can’t open that page.</p>}

      <div className="mb-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {[
          ['Video calls to make', q.videoCalls, '/admin/orders?status=video', 'orders.view'],
          ['To pack and ship', q.toShip, '/admin/orders?status=to_ship', 'orders.view'],
          ['Awaiting payment', q.awaitingPay, '/admin/orders?status=awaiting_payment', 'orders.view'],
          ['Open returns / claims', q.returns, '/admin/returns', 'service.manage'],
          ['Open tickets', q.tickets, '/admin/tickets', 'tickets.manage'],
          ['Student IDs to check', q.students, '/admin/students', 'students.review'],
          ['Units in the workshop', q.inWorkshop, '/admin/inventory?status=workshop', 'inventory.manage'],
        ].filter(([, , , p]) => can(p as Parameters<typeof v.can>[0])).map(([label, n, href]) => (
          <Link key={href as string} href={href as string} className="group rounded-card border border-line bg-white p-4 transition hover:border-ink">
            <p className="text-[12.5px] text-mute">{label}</p>
            <p className="mt-1 flex items-center justify-between"><span className="price text-[26px]">{n}</span><ArrowRight size={16} className="text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" /></p>
          </Link>
        ))}
      </div>

      {setup.length > 0 && v.can('settings.manage') && (
        <Panel className="mb-6" title="Before going live">
          <ul className="space-y-1.5 text-[14px]">{setup.map((x) => <li key={x} className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" aria-label="Warning" /> {x}</li>)}</ul>
          <p className="mt-3 text-[13px] text-mute">See the README’s go-live checklist for where each one is set.</p>
        </Panel>
      )}

      {a ? (
        <>
          <form action="/admin" className="mb-5 flex flex-wrap items-end gap-2" aria-label="Date range">
            {PRESETS.map(([k, label]) => <Link key={k} href={`/admin?days=${k}`} className="chip !min-h-9 !text-[13px]" aria-current={r.key === k ? 'page' : undefined}>{label}</Link>)}
            <span className="mx-1 h-6 w-px bg-line-2" aria-hidden="true" />
            <label className="text-[12.5px] text-mute">From<input type="date" name="from" defaultValue={r.fromStr} className="field !min-h-9 text-[13px]" /></label>
            <label className="text-[12.5px] text-mute">To<input type="date" name="to" defaultValue={r.toStr} className="field !min-h-9 text-[13px]" /></label>
            <button className="btn btn-ghost btn-sm !min-h-9">Apply</button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Net revenue" value={rupees(a.revenue)} sub={a.refunded ? `${rupees(a.gross)} gross, ${rupees(a.refunded)} refunded` : `${r.label}, incl. GST`} />
            <Kpi label="Orders" value={a.orders.toLocaleString('en-IN')} sub={`${a.unitsSold} ${a.unitsSold === 1 ? 'laptop' : 'laptops'} sold`} />
            <Kpi label="Average order" value={a.orders ? rupees(a.aov) : '—'} sub={a.discounts ? `${rupees(a.discounts)} in discounts` : 'No discounts given'} />
            <Kpi label="Gross margin" value={a.profit ? rupees(a.profit.margin) : '—'} sub={a.profit ? `${Math.round((a.profit.margin / Math.max(1, a.profit.revenue)) * 100)}% on ${a.profit.units} of ${a.profit.of} units with a recorded cost` : 'Needs purchase costs on sold units'} />
            <Kpi label="Product page views" value={a.views.toLocaleString('en-IN')} sub={a.conversion != null ? `${(a.conversion * 100).toFixed(2)}% of views became orders` : 'No views recorded yet'} />
            <Kpi label="Refunds" value={rupees(a.refunds.sum)} sub={`${a.refunds.n} ${a.refunds.n === 1 ? 'refund' : 'refunds'}`} />
            <Kpi label="GST collected" value={rupees(a.tax)} sub="Included in revenue" />
            <Kpi label="New customers" value={a.newCustomers.toLocaleString('en-IN')} sub="Accounts created" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Panel title={`Net revenue per day · ${r.label}`}>
              {a.orders ? <DailyRevenue days={days} /> : <p className="py-10 text-center text-mute">No paid orders in this period yet.</p>}
            </Panel>
            <Panel title="Orders by status">
              {a.byStatus.length ? (
                <ul className="divide-y divide-line text-[14px]">
                  {a.byStatus.sort((x, y) => y.n - x.n).map((x) => (
                    <li key={x.status} className="flex items-center justify-between py-2"><span className={`pill pill-${STATUS[x.status]?.tone ?? 'info'}`}>{STATUS[x.status]?.label ?? x.status}</span><Link href={`/admin/orders?status=${x.status}`} className="mono hover:underline">{x.n}</Link></li>
                  ))}
                </ul>
              ) : <p className="text-mute">No orders in this period.</p>}
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Revenue by brand"><Bars rows={a.byBrand.map((b) => ({ label: b.brand, value: b.revenue, note: `${b.units} sold` }))} /></Panel>
            <Panel title="Best-selling models">
              {a.topProducts.length ? (
                <ol className="divide-y divide-line text-[14px]">
                  {a.topProducts.map((p, i) => <li key={p.id} className="flex items-center gap-3 py-2"><span className="mono w-5 text-mute">{i + 1}</span><Link href={`/admin/products/${p.id}`} className="flex-1 truncate hover:underline">{p.title}</Link><span className="mono text-mute">{p.units} sold</span><span className="mono w-24 text-right">{rupees(p.revenue)}</span></li>)}
                </ol>
              ) : <p className="text-mute">No sales in this period.</p>}
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Inventory right now" actions={<Link href="/admin/inventory" className="text-[13px] underline">Open inventory</Link>}>
              <table className="w-full text-[14px]">
                <thead><tr className="text-left text-[12px] text-mute"><th className="pb-2 font-medium">Status</th><th className="pb-2 text-right font-medium">Units</th><th className="pb-2 text-right font-medium">Cost recorded</th><th className="pb-2 text-right font-medium">Avg days</th></tr></thead>
                <tbody>
                  {a.inventory.sort((x, y) => y.n - x.n).map((x) => (
                    <tr key={x.status} className="border-t border-line"><td className="py-2"><Link href={`/admin/inventory?status=${x.status}`} className="hover:underline">{UNIT_STATUS_LABEL[x.status as UnitStatus] ?? x.status}</Link></td><td className="mono py-2 text-right">{x.n}</td><td className="mono py-2 text-right">{v.can('inventory.cost') && x.withCost ? `${rupees(x.cost)}${x.withCost < x.n ? ` (${x.withCost})` : ''}` : '—'}</td><td className="mono py-2 text-right">{x.avgAge}</td></tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <Panel title="Age of units on sale"><Bars format="count" rows={['0–14 days', '15–30 days', '31–60 days', '61+ days'].map((b) => ({ label: b, value: a.aging.find((x) => x.bucket === b)?.n ?? 0 }))} /></Panel>
          </div>
        </>
      ) : (
        <Panel><p className="text-mute">Your role doesn’t include sales analytics. Use the queues above.</p></Panel>
      )}
    </div>
  );
}
