'use client';

/**
 * The home page's one orchestrated moment: a test line sweeps down a laptop's screen
 * and its condition tag fills in as it goes, ending on the grade.
 * With reduced motion the finished tag is shown straight away.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ArtSpec } from '@/lib/db/schema';
import { CHECK_COUNT, CONDITION, GRADES, type GradeKey } from '@/lib/config';
import { rupees } from '@/lib/format';
import LaptopArt from '../LaptopArt';

type Props = { slug: string; title: string; brand: string; art: ArtSpec; grade: GradeKey; price: number };

const SCAN_MS = 2600;

export default function HeroScan({ slug, title, brand, art, grade, price }: Props) {
  const reduce = useReducedMotion();
  const [t, setT] = useState(reduce ? 1 : 0); // scan progress 0..1

  useEffect(() => {
    if (reduce) { setT(1); return; }
    let raf = 0;
    const start = performance.now() + 500;
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / SCAN_MS));
      setT(k);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const g = GRADES[grade];
  const rows: { k: string; v: string; at: number }[] = [
    { k: 'Screen', v: 'No dead pixels', at: 0.12 },
    { k: 'Battery health', v: `${g.batteryMin}% or more`, at: 0.3 },
    { k: 'SSD health', v: `${CONDITION.ssdHealthMin}% or more`, at: 0.48 },
    { k: 'Keyboard', v: 'Every key tested', at: 0.66 },
    { k: 'Ports and wireless', v: 'All working', at: 0.82 },
  ];
  const done = t >= 1;
  const checks = Math.round(CHECK_COUNT * t);

  return (
    <div className="relative">
      <div className="relative">
        <LaptopArt art={art} brand={brand} slug={slug} className="relative w-full" title={`${title}, illustration`} />
        {/* the test line, clipped to the screen */}
        <div className="pointer-events-none absolute left-[18.3%] top-[7.3%] h-[54.5%] w-[63.3%] overflow-hidden rounded-[3px]" aria-hidden>
          {!done && (
            <>
              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-tag/0 to-tag/25" style={{ height: `${t * 100}%` }} />
              <div className="absolute inset-x-0 h-[3px] bg-tag shadow-[0_0_18px_4px_rgba(245,200,76,.75)]" style={{ top: `calc(${t * 100}% - 1px)` }} />
            </>
          )}
          <motion.div className="absolute inset-0 flex items-center justify-center" initial={false} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: 0.4 }}>
            <span className="rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-pass shadow-sm md:text-[13px]">All {CHECK_COUNT} checks passed</span>
          </motion.div>
        </div>
      </div>

      <div className="absolute -bottom-10 right-0 origin-top sm:-bottom-6 sm:right-[-4%] md:right-[-8%]">
        <span className="absolute left-1/2 top-[-38px] h-10 w-px bg-spruce/35" aria-hidden />
        <motion.div
          className="qc-shadow origin-top"
          initial={reduce ? false : { rotate: -2 }}
          animate={done ? { rotate: [null, 7, 2.5] } : { rotate: -2 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="qc-tag [--tag-w:236px] md:[--tag-w:252px]">
            <p className="display text-center text-[17px] font-bold leading-none">Condition report</p>
            <dl className="mt-3 border-y border-spruce/15 text-[13px]">
              {rows.map((r) => {
                const shown = t >= r.at;
                return (
                  <div key={r.k} className="flex items-baseline justify-between gap-3 border-b border-spruce/10 py-[6px] last:border-0">
                    <dt className="text-spruce/75">{r.k}</dt>
                    <motion.dd className="text-right font-semibold" initial={false} animate={{ opacity: shown ? 1 : 0, x: shown ? 0 : 6 }} transition={{ duration: 0.25 }}>{r.v}</motion.dd>
                  </div>
                );
              })}
            </dl>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-[11.5px] text-spruce/75">Checks passed</p>
                <p className="price text-[30px] leading-none">{checks}<span className="text-[17px] text-spruce/60">/{CHECK_COUNT}</span></p>
              </div>
              <motion.div initial={false} animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 1.8, rotate: -8 }} transition={{ type: 'spring', stiffness: 380, damping: 16 }} className="rounded-lg border-[2.5px] border-pass px-2 py-1 text-pass">
                <span className="display text-[16px] font-extrabold leading-none">{g.label}</span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <p className="mt-3 max-w-[52%] text-[13.5px] text-mute sm:max-w-[58%]">
        <Link href={`/laptops/${slug}?grade=${grade}`} className="font-medium text-spruce underline underline-offset-2">{title}</Link>, {g.label.toLowerCase()} grade, {rupees(price)}
      </p>
    </div>
  );
}
