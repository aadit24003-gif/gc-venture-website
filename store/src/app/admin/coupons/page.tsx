import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { formatDate, rupees } from '@/lib/format';
import CouponForm, { CouponToggle } from './CouponForm';

export default async function AdminCoupons() {
  const d = await db();
  const rows = await d.select().from(coupons).orderBy(desc(coupons.createdAt));
  return (
    <div>
      <h1 className="text-[38px]">Coupons</h1>
      <p className="mt-2 max-w-[72ch] text-mute">Customers type the code at checkout. A coupon and the student discount never stack; the customer gets whichever saves more.</p>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <section className="sheet p-6" aria-labelledby="new-h">
          <h2 id="new-h" className="text-[22px]">New coupon</h2>
          <CouponForm />
        </section>
        <section className="sheet p-6" aria-labelledby="list-h">
          <h2 id="list-h" className="text-[22px]">All coupons</h2>
          {rows.length === 0 ? <p className="mt-3 text-mute">No coupons yet.</p> : (
            <ul className="mt-3 divide-y divide-line text-[14.5px]">
              {rows.map((c) => (
                <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-spruce">{c.code} <span className="font-normal text-ink">{c.kind === 'percent' ? `${c.value}% off` : `${rupees(c.value)} off`}</span></p>
                    <p className="text-[13px] text-mute">
                      {[c.minSubtotal ? `orders over ${rupees(c.minSubtotal)}` : null, c.maxDiscount ? `up to ${rupees(c.maxDiscount)}` : null, c.usageLimit ? `${c.usedCount} of ${c.usageLimit} used` : `${c.usedCount} used`, c.endsAt ? `ends ${formatDate(c.endsAt)}` : null, c.note].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <CouponToggle code={c.code} active={c.active} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
