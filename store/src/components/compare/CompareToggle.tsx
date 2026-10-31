'use client';

import { Check, Plus } from 'lucide-react';
import { compare, COMPARE_MAX, useCompare } from './compare-store';
import { toast } from '../Toaster';

export default function CompareToggle({ slug, title, className = '' }: { slug: string; title: string; className?: string }) {
  const list = useCompare();
  const on = list.some((i) => i.slug === slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const r = compare.toggle({ slug, title });
        if (r === 'full') toast(`You can compare up to ${COMPARE_MAX} laptops. Remove one first.`, 'error');
      }}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors ${on ? 'bg-ink text-white' : 'bg-white/90 text-ink shadow-[var(--shadow-card)] backdrop-blur hover:bg-white'} ${className}`}
    >
      {on ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
      Compare
    </button>
  );
}
