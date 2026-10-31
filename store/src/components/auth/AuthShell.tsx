import { BadgeCheck, Package, ShieldCheck, Tag } from 'lucide-react';
import { POLICY, STUDENT } from '@/lib/config';

/** Two-column frame for sign-in, sign-up and password pages. */
export default function AuthShell({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="wrap grid gap-8 pb-10 pt-8 md:pt-14 lg:grid-cols-[1fr_0.85fr]">
      <div className="rounded-[28px] border border-line bg-white px-6 py-10 md:px-14 md:py-14">
        <div className="max-w-[440px]">
          <h1 className="text-[34px] md:text-[42px]">{title}</h1>
          {intro && <div className="mt-3 text-[15.5px] text-mute">{intro}</div>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <aside className="hidden rounded-[28px] bg-ink p-12 text-white/75 lg:block">
        <p className="eyebrow !text-white/50">Your account</p>
        <h2 className="mt-3 max-w-[18ch] text-[34px] text-white">Orders, warranty and your student price, in one place.</h2>
        <ul className="mt-10 space-y-6 text-[15.5px]">
          {[
            [Package, 'Track every order', 'Eight steps, from final inspection to your door.'],
            [ShieldCheck, `${POLICY.warrantyMonths}-month warranty`, 'Claim it in two taps, no invoice hunting.'],
            [Tag, `${STUDENT.percent}% off for students`, 'Verify once; the price applies for a year.'],
            [BadgeCheck, 'Your laptops’ reports', 'Battery, SSD and every check, saved with your order.'],
          ].map(([I, t, d]) => {
            const Icon = I as typeof Package;
            return <li key={t as string} className="flex gap-4"><Icon size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" /><span><b className="block text-white">{t as string}</b>{d as string}</span></li>;
          })}
        </ul>
      </aside>
    </div>
  );
}
