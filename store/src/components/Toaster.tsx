'use client';

/** Small confirmation messages, e.g. "Added to cart". Call toast('…') from any client component. */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type T = { id: number; text: string; tone?: 'ok' | 'error' };
const listeners = new Set<(t: T) => void>();
let n = 0;

export function toast(text: string, tone: T['tone'] = 'ok') {
  const t = { id: ++n, text, tone };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const on = (t: T) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 3800);
    };
    listeners.add(on);
    return () => { listeners.delete(on); };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[90] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.p
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`pointer-events-auto rounded-2xl px-5 py-3 text-[15px] font-medium shadow-[0_14px_40px_-12px_rgba(15,61,51,.5)] ${t.tone === 'error' ? 'bg-alert text-white' : 'bg-spruce text-white'}`}
          >
            {t.text}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
