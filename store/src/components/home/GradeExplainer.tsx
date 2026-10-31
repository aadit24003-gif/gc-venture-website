'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ArtSpec } from '@/lib/db/schema';
import { GRADES, GRADE_ORDER, type GradeKey } from '@/lib/config';
import { rupees } from '@/lib/format';
import LidMarks from '../LidMarks';

type Example = { title: string; slug: string; brand: string; colour: ArtSpec['colour']; prices: Partial<Record<GradeKey, number>> };

/** Pick a grade and see what its wear looks like on a real lid, and what it costs on one model. */
export default function GradeExplainer({ example }: { example: Example }) {
  const [grade, setGrade] = useState<GradeKey>('excellent');
  const g = GRADES[grade];
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="relative rounded-[32px] bg-white p-6 md:p-10">
        <LidMarks colour={example.colour} grade={grade} brand={example.brand} className="mx-auto w-full max-w-[520px]" annotate />
        <p className="mt-2 text-center text-[13px] text-mute">Lid of a {example.title}, {g.label.toLowerCase()} grade</p>
      </div>
      <div>
        <div role="radiogroup" aria-label="Grade" className="grid grid-cols-3 gap-2 rounded-[20px] bg-bench-2 p-1.5">
          {GRADE_ORDER.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={grade === k} onClick={() => setGrade(k)}
              className="relative rounded-2xl px-3 py-3 text-[15px] font-semibold text-mute transition-colors aria-checked:text-spruce">
              {grade === k && <motion.span layoutId="grade-pill" className="absolute inset-0 rounded-2xl bg-white shadow-[0_8px_20px_-12px_rgba(15,61,51,.45)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative">{GRADES[k].label}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={grade} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="mt-6">
            <p className="display text-[30px] font-semibold leading-tight text-spruce">{g.short}</p>
            <p className="mt-3 max-w-[48ch] text-[16.5px] leading-relaxed">{g.body}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4">
                <dt className="text-[13.5px] text-mute">Battery health</dt>
                <dd className="price mt-1 text-[28px]">{g.batteryMin}%+</dd>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <dt className="text-[13.5px] text-mute">{example.title}</dt>
                <dd className="price mt-1 text-[28px]">{example.prices[grade] ? rupees(example.prices[grade]!) : 'Sold out'}</dd>
              </div>
            </dl>
          </motion.div>
        </AnimatePresence>
        <p className="mt-5 text-[15px] text-mute">Every grade works the same: same checks, same warranty. Grades only describe how the outside looks. <Link href="/how-we-test#grades" className="link">More on grading</Link></p>
      </div>
    </div>
  );
}
