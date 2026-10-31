import { asc, desc, sql } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { couponRedemptions, coupons, products } from '@/lib/db/schema';
import { formatDate, rupees } from '@/lib/format';
import { BRANDS } from '@/lib/filters';
import { PageHead, Panel, Table, td } from '../ui';
import CouponForm, { CouponToggle } from './CouponForm';
import { EMPTY_COUPON } from './empty';

export const metadata = { title: 'Coupons' };
const day = (d: Date | null) => (d ? new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10) : null);

export default async function Coupons() {
  await requireStaff('coupons.manage');
  const d = await db();
  const [list, prods, saved] = await Promise.all([
    d.select().from(coupons).orderBy(desc(coupons.createdAt)),
    d.select({ id: products.id, title: products.title }).from(products).orderBy(asc(products.title)),
    d.select({ code: couponRedemptions.code, n: sql<number>`count(*)::int`, sum: sql<number>`coalesce(sum(${couponRedemptions.amount}),0)::int` }).from(couponRedemptions).groupBy(couponRedemptions.code),
  ]);
  const now = new Date();
  return (
    <div>
      <PageHead title="Coupons" intro="A coupon and the student discount never stack: the customer gets whichever saves more. Limits are checked again when the order is placed." />
      <Panel title="New coupon" className="mb-6"><CouponForm initial={EMPTY_COUPON} isNew products={prods} brands={[...BRANDS]} /></Panel>
      <Table head={['Code', 'Discount', 'Rules', 'Used', 'Valid', 'Status', '']} empty={list.length ? false : 'No coupons yet.'}>
        {list.map((c) => {
          const s = saved.find((x) => x.code === c.code);
          const live = c.active && (!c.endsAt || c.endsAt > now) && (!c.startsAt || c.startsAt <= now) && (c.usageLimit == null || c.usedCount < c.usageLimit);
          return (
            <tr key={c.code} className="align-top">
              <td className={td}><span className="mono font-semibold">{c.code}</span>{c.note && <span className="block text-[12px] text-mute">{c.note}</span>}</td>
              <td className={td}>{c.kind === 'percent' ? `${c.value}%` : rupees(c.value)}{c.maxDiscount ? <span className="block text-[12px] text-mute">max {rupees(c.maxDiscount)}</span> : null}</td>
              <td className={`${td} text-[12.5px] text-mute`}>{[c.minSubtotal ? `min ${rupees(c.minSubtotal)}` : null, c.firstOrderOnly ? 'first order' : null, c.perUserLimit ? `${c.perUserLimit}/customer` : null, c.brands.length ? c.brands.join(', ') : null, c.productIds.length ? `${c.productIds.length} models` : null].filter(Boolean).join(' · ') || 'Any order'}</td>
              <td className={`${td} mono`}>{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''}{s ? <span className="block text-[12px] text-mute">{rupees(s.sum)} given</span> : null}</td>
              <td className={`${td} text-[12.5px]`}>{c.startsAt ? `from ${formatDate(c.startsAt)}` : ''}{c.endsAt ? ` until ${formatDate(c.endsAt)}` : c.startsAt ? '' : 'No end date'}</td>
              <td className={td}><span className={`pill ${live ? 'pill-ok' : 'pill-done'}`}>{live ? 'Live' : c.active ? 'Not live' : 'Paused'}</span></td>
              <td className={td}>
                <div className="flex gap-2"><CouponToggle code={c.code} active={c.active} />
                  <details className="relative"><summary className="btn btn-ghost btn-sm list-none">Edit</summary>
                    <div className="absolute right-0 z-20 mt-2 w-[min(760px,90vw)] rounded-[16px] border border-line bg-white p-5 shadow-[var(--shadow-pop)]">
                      <CouponForm isNew={false} products={prods} brands={[...BRANDS]} initial={{ code: c.code, kind: c.kind as 'percent' | 'flat', value: c.kind === 'percent' ? c.value : c.value / 100, minSubtotal: c.minSubtotal / 100, maxDiscount: c.maxDiscount ? c.maxDiscount / 100 : null, usageLimit: c.usageLimit, perUserLimit: c.perUserLimit, firstOrderOnly: c.firstOrderOnly, productIds: c.productIds, brands: c.brands, startsAt: day(c.startsAt), endsAt: day(c.endsAt), note: c.note, active: c.active }} />
                    </div>
                  </details>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
