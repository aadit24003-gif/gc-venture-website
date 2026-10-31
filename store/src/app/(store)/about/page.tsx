import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND, CHECK_COUNT, LEGAL, POLICY } from '@/lib/config';

export const metadata: Metadata = { title: 'About us', description: `${BRAND.name} is run by the team behind ${LEGAL.rentals.name}, who have prepared business laptops for companies across India since 2013.` };

export default function About() {
  return (
    <div className="wrap pb-10 pt-10 md:pt-16">
      <h1 className="max-w-[18ch] text-[44px] leading-[1.02] md:text-[64px]">We’ve been preparing business laptops since 2013.</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5 text-[17.5px] leading-relaxed text-ink/85">
          <p>{BRAND.name} is run by {LEGAL.entity}, the team behind <a href={LEGAL.rentals.url} className="link" target="_blank" rel="noopener">{LEGAL.rentals.name}</a>. For more than a decade we have rented laptops to companies across India: testing them, configuring them, delivering them and fixing them when they break.</p>
          <p>That work leaves us with something most sellers don’t have: a workshop that knows Latitudes, EliteBooks, ThinkPads and MacBooks inside out, a steady supply of well-kept business machines, and the habit of testing every one before it goes out.</p>
          <p>{BRAND.name} puts that to work for students, freelancers and small teams. The same {CHECK_COUNT} checks, honest grades, a {POLICY.warrantyMonths}-month warranty, and prices far below new, so a good laptop is within reach and another one stays out of landfill.</p>
        </div>
        <aside className="space-y-3">
          {[['2013', `${LEGAL.rentals.name} founded`], [String(CHECK_COUNT), 'checks on every laptop'], [`${POLICY.warrantyMonths} months`, 'warranty, with free pickup']].map(([n, l]) => (
            <div key={l} className="rounded-sheet bg-white p-6"><p className="price text-[42px] leading-none">{n}</p><p className="mt-2 text-mute">{l}</p></div>
          ))}
        </aside>
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/how-we-test" className="btn btn-primary btn-lg">How we test</Link>
        <Link href="/contact" className="btn btn-ghost btn-lg">Contact us</Link>
      </div>
    </div>
  );
}
