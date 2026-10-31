import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { CHECKS, CHECK_COUNT, CONDITION, GRADES, GRADE_ORDER, POLICY } from '@/lib/config';
import LidMarks from '@/components/LidMarks';

export const metadata: Metadata = {
  title: 'How we test and grade refurbished laptops',
  description: `Every laptop passes ${CHECK_COUNT} checks, is wiped to NIST 800-88 and graded Pristine, Excellent or Good on its looks alone.`,
};

export default function HowWeTest() {
  return (
    <div className="pb-10">
      <section className="wrap pt-10 md:pt-16">
        <h1 className="max-w-[16ch] text-[44px] leading-[1.02] md:text-[68px]">How we test and grade every laptop</h1>
        <p className="mt-5 max-w-[62ch] text-[18px] leading-relaxed text-ink/80">
          Each laptop comes in from a company’s retired fleet or our own rental returns. It is opened, cleaned, repaired with matching parts where needed, then put through the same {CHECK_COUNT} checks. Only a laptop that passes every one goes on sale, with its grade and minimum battery and SSD health on the tag.
        </p>
      </section>

      <ol className="wrap mt-12 grid gap-3 md:grid-cols-4">
        {[
          ['Inspect', 'Serial, configuration and locks checked. Anything stolen, locked or mismatched is rejected.'],
          ['Repair', 'Worn batteries, keyboards, hinges and screens replaced with matching parts.'],
          ['Test', `${CHECK_COUNT} checks across screen, battery, storage, ports, keys, camera and software.`],
          ['Grade and pack', 'Graded on looks alone, deep cleaned, wiped, reinstalled and packed with a charger.'],
        ].map(([t, b], i) => (
          <li key={t} className="rounded-sheet bg-white p-6">
            <span className="display flex h-10 w-10 items-center justify-center rounded-full bg-tag text-[18px] font-bold text-spruce">{i + 1}</span>
            <p className="display mt-4 text-[20px] font-semibold text-spruce">{t}</p>
            <p className="mt-1 text-[15px] text-mute">{b}</p>
          </li>
        ))}
      </ol>

      <section className="mt-16 bg-spruce py-16 md:py-20" aria-labelledby="checks-h">
        <div className="wrap">
          <h2 id="checks-h" className="text-[36px] text-white md:text-[48px]">The {CHECK_COUNT} checks</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {CHECKS.map((g) => (
              <div key={g.group}>
                <h3 className="text-[19px] text-tag">{g.group}</h3>
                <ul className="mt-3 space-y-2">
                  {g.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[15px] text-white/80"><Check size={16} className="mt-1 shrink-0 text-tag" strokeWidth={3} />{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="grades" className="wrap mt-20 scroll-mt-28" aria-labelledby="grades-h">
        <h2 id="grades-h" className="max-w-[22ch] text-[36px] md:text-[48px]">Grades describe the outside, not the inside</h2>
        <p className="mt-4 max-w-[62ch] text-[17px] text-mute">Every grade passes the same checks and gets the same {POLICY.warrantyMonths}-month warranty. What changes is how much wear the body shows, and the price.</p>
        <ul className="mt-10 grid gap-4 lg:grid-cols-3">
          {GRADE_ORDER.map((k) => {
            const g = GRADES[k];
            return (
              <li key={k} className="rounded-sheet bg-white p-6">
                <div className="rounded-2xl bg-bench p-3"><LidMarks colour="graphite" grade={k} brand="Dell" className="w-full" annotate /></div>
                <h3 className="mt-5 text-[26px]">{g.label}</h3>
                <p className="mt-1 font-semibold text-ink">{g.short}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-mute">{g.body}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-[14px]">
                  <div className="rounded-xl bg-bench p-3"><dt className="text-mute">Battery health</dt><dd className="price text-[22px]">{g.batteryMin}%+</dd></div>
                  <div className="rounded-xl bg-bench p-3"><dt className="text-mute">SSD health</dt><dd className="price text-[22px]">{CONDITION.ssdHealthMin}%+</dd></div>
                </dl>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="wrap mt-20 grid gap-6 md:grid-cols-2" aria-label="Data and packing">
        <div className="rounded-sheet bg-white p-7">
          <h2 className="text-[26px]">Your data, and the last owner’s</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-mute">Every drive is wiped to the NIST 800-88 standard before testing, and Windows or macOS is installed fresh and activated. We check there is no BIOS password, company management (MDM) or Apple iCloud lock, so the laptop is entirely yours.</p>
        </div>
        <div className="rounded-sheet bg-white p-7">
          <h2 className="text-[26px]">In the box</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-mute">The laptop, a matching charger, and the invoice by email. It ships in a padded box with tamper tape, insured until it reaches you. If the box arrives damaged, record a short video while opening it and tell us within 48 hours.</p>
        </div>
      </section>
      <p className="wrap mt-10"><Link href="/laptops" className="btn btn-primary btn-lg">Browse tested laptops</Link></p>
    </div>
  );
}
