import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, LifeBuoy, MessageCircle, Package, RotateCcw, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { formatPhone } from '@/lib/format';

export const metadata: Metadata = { title: 'Help and support', description: 'Track an order, start a return, claim warranty, or talk to us.' };

export default async function Support() {
  const { business: b } = await getSettings();
  const tiles = [
    [Package, 'Track an order', 'Eight steps from inspection to your door.', '/track'],
    [RotateCcw, 'Return or replace', 'Within the return window, from your order.', '/returns'],
    [ShieldCheck, 'Warranty claim', 'Free pickup and repair.', '/account/warranty'],
    [Truck, 'Delivery', 'Times, costs and pay on delivery.', '/shipping'],
    [Wallet, 'Payments and refunds', 'Methods, EMI, refund timing.', '/faq'],
    [GraduationCap, 'Student discount', 'Verify and get 10% off.', '/students'],
  ] as const;
  return (
    <div className="wrap pb-10 pt-10 md:pt-14">
      <p className="eyebrow">Help centre</p>
      <h1 className="mt-3 text-[40px] md:text-[56px]">How can we help?</h1>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([I, t, d, href]) => <li key={href}><Link href={href} className="flex h-full gap-4 rounded-[20px] border border-line bg-white p-5 transition hover:border-ink"><I size={22} className="mt-0.5 shrink-0" aria-hidden="true" /><span><b className="block">{t}</b><span className="text-[14.5px] text-mute">{d}</span></span></Link></li>)}
      </ul>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener" className="rounded-[20px] bg-ink p-6 text-white/75 transition hover:bg-ink-2"><MessageCircle size={22} className="text-accent" aria-hidden="true" /><p className="mt-3 text-[18px] font-semibold text-white">WhatsApp</p><p className="mt-1 text-[14.5px]">Fastest. {formatPhone(b.whatsapp)}</p></a>
        <Link href="/account/support" className="rounded-[20px] border border-line bg-white p-6 transition hover:border-ink"><LifeBuoy size={22} aria-hidden="true" /><p className="mt-3 text-[18px] font-semibold">Write to us</p><p className="mt-1 text-[14.5px] text-mute">Keep the conversation in your account.</p></Link>
        <Link href="/contact" className="rounded-[20px] border border-line bg-white p-6 transition hover:border-ink"><p className="text-[18px] font-semibold">Call or email</p><p className="mt-1 text-[14.5px] text-mute">{formatPhone(b.phone)} · {b.email}<br />{b.hours}</p></Link>
      </div>
      <p className="mt-8 text-[14px] text-mute">Unresolved complaint? Contact our <Link href="/grievance" className="underline">grievance officer</Link>.</p>
    </div>
  );
}
