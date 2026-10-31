'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { CHECKS } from '@/lib/config';

/** The test sheet, group by group. Ticks fill in as each group scrolls into view. */
export default function ChecksBoard() {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [seen, setSeen] = useState<boolean[]>(() => CHECKS.map(() => false));

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setSeen(CHECKS.map(() => true)); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = Number((e.target as HTMLElement).dataset.i);
        setSeen((s) => (s[i] ? s : s.map((v, j) => (j === i ? true : v))));
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -18% 0px' });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CHECKS.map((g, i) => (
        <li key={g.group} ref={(el) => { refs.current[i] = el; }} data-i={i} className="rounded-[24px] bg-white/[.06] p-5 ring-1 ring-white/10">
          <p className="display text-[19px] font-semibold text-white">{g.group}</p>
          <ul className="mt-3 space-y-2.5">
            {g.items.map((item, k) => (
              <li key={item} className="flex items-start gap-2.5 text-[14.5px] text-white/80">
                <span
                  className={`mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-all duration-500 ${seen[i] ? 'bg-tag text-spruce' : 'bg-white/10 text-transparent'}`}
                  style={{ transitionDelay: seen[i] ? `${k * 140 + 120}ms` : '0ms' }}
                  aria-hidden
                >
                  <Check size={12} strokeWidth={3.2} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
