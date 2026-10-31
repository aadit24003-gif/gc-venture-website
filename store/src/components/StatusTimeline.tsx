'use client';

import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { formatDate } from '@/lib/format';

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', body: 'Reserved for you' },
  { key: 'packed', label: 'Packed', body: 'Re-tested and boxed' },
  { key: 'shipped', label: 'Shipped', body: 'With the courier' },
  { key: 'delivered', label: 'Delivered', body: 'Warranty starts' },
];

/** Order progress: a track that fills to the current step. */
export default function StatusTimeline({ status, events }: { status: string; events: { status: string; at: string }[] }) {
  const at = STEPS.findIndex((s) => s.key === status);
  const when = (k: string) => events.filter((e) => e.status === k).at(-1)?.at;
  return (
    <ol className="relative grid grid-cols-4 gap-2">
      <div className="absolute left-[12.5%] right-[12.5%] top-[17px] h-[3px] rounded-full bg-bench-2" aria-hidden>
        <motion.div className="h-full rounded-full bg-pass" initial={{ width: 0 }} animate={{ width: `${(Math.max(0, at) / (STEPS.length - 1)) * 100}%` }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />
      </div>
      {STEPS.map((s, i) => {
        const done = i <= at;
        const t = when(s.key);
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center" aria-current={i === at ? 'step' : undefined}>
            <motion.span
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-[3px] ${done ? 'border-pass bg-pass text-white' : 'border-bench-2 bg-white text-mute'}`}
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.18, type: 'spring', stiffness: 400, damping: 20 }}
            >
              {done ? <Check size={16} strokeWidth={3} /> : <span className="text-[13px] font-semibold">{i + 1}</span>}
            </motion.span>
            <span className={`mt-3 text-[14.5px] font-semibold ${done ? 'text-spruce' : 'text-mute'}`}>{s.label}</span>
            <span className="text-[12.5px] text-mute">{t ? formatDate(t, true) : s.body}</span>
          </li>
        );
      })}
    </ol>
  );
}
