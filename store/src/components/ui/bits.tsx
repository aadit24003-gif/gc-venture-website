import { Star } from 'lucide-react';
import { GRADES, type GradeKey } from '@/lib/config';
import { rupees } from '@/lib/format';
import type { Tone } from '@/lib/order-status';

export function Stars({ value, size = 14, label = true }: { value: number; size?: number; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={label ? `${value} out of 5 stars` : undefined} role={label ? 'img' : undefined}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size} aria-hidden="true" className={i <= Math.round(value) ? 'fill-ink text-ink' : 'fill-canvas-2 text-canvas-2'} />
      ))}
    </span>
  );
}

/** Battery or SSD health: number plus a bar. */
export function Meter({ value, label, min }: { value: number | null; label: string; min?: number }) {
  if (value == null) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-mute">{label}</span>
        <span className="mono font-medium text-ink">{value}%</span>
      </div>
      <div className="meter mt-1" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <span style={{ width: `${value}%`, background: min != null && value < min ? 'var(--color-warn)' : undefined }} />
      </div>
    </div>
  );
}

export function GradeBadge({ grade, size = 'md' }: { grade: GradeKey; size?: 'sm' | 'md' }) {
  const g = GRADES[grade];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[8px] bg-canvas font-semibold text-ink ${size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-2.5 text-[13px]'}`}>
      <span className="mono text-[11px] text-mute">{g.tone}</span>{g.label}
    </span>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`pill pill-${tone}`}>{label}</span>;
}

export function Price({ value, was, className = '' }: { value: number; was?: number | null; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="price">{rupees(value)}</span>
      {was && was > value ? <s className="num text-[0.62em] font-medium text-faint">{rupees(was)}</s> : null}
    </span>
  );
}

export function SectionHead({ eyebrow, title, intro, action, id, align = 'left' }: { eyebrow?: string; title: React.ReactNode; intro?: string; action?: React.ReactNode; id?: string; align?: 'left' | 'center' }) {
  const center = align === 'center';
  return (
    <div data-reveal className={`flex flex-wrap items-end gap-4 ${center ? 'flex-col items-center text-center' : 'justify-between'}`}>
      <div className={`max-w-[720px] ${center ? 'mx-auto' : ''}`}>
        {eyebrow && <p className="eyebrow eyebrow-gold">{eyebrow}</p>}
        <h2 id={id} className="mt-1.5 text-[26px] md:text-[34px]">{title}</h2>
        {intro && <p className={`mt-2 text-[16px] text-mute ${center ? 'mx-auto' : ''}`}>{intro}</p>}
      </div>
      {action}
    </div>
  );
}
