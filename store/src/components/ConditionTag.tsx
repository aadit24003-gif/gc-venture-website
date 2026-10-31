import { CHECK_COUNT, CONDITION, GRADES, type GradeKey } from '@/lib/config';

/**
 * The condition report, printed on the yellow tag: what we guarantee for the chosen grade.
 * Values are minimums for the grade, not readings from one unit.
 */
export default function ConditionTag({ grade, sku, className = '', hole }: { grade: GradeKey; sku: string; className?: string; hole?: string }) {
  const g = GRADES[grade];
  const rows: [string, string][] = [
    ['Grade', g.label],
    ['Battery health', `${g.batteryMin}% or more`],
    ['SSD health', `${CONDITION.ssdHealthMin}% or more`],
    ['Screen', 'No dead pixels'],
    ['Keyboard', 'Every key tested'],
    ['Checks passed', `${CHECK_COUNT} of ${CHECK_COUNT}`],
  ];
  return (
    <div className="qc-shadow">
    <div className={`qc-tag ${className}`} style={hole ? ({ ['--hole' as string]: hole }) : undefined}>
      <p className="display text-center text-[17px] font-bold leading-none">Condition report</p>
      <dl className="mt-3 divide-y divide-spruce/15 border-y border-spruce/15 text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-[7px]">
            <dt className="text-spruce/75">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-end justify-between gap-3">
        <svg width="86" height="26" viewBox="0 0 86 26" aria-hidden>
          {Array.from({ length: 30 }, (_, i) => (
            <rect key={i} x={i * 2.9} y="0" width={(sku.charCodeAt(i % sku.length) + i) % 3 === 0 ? 1.8 : 0.9} height="26" fill="#0f3d33" />
          ))}
        </svg>
        <p className="text-right text-[11px] font-semibold leading-tight tracking-wide">{sku}</p>
      </div>
    </div>
    </div>
  );
}

export const skuFor = (slug: string, grade: GradeKey) =>
  `${slug.split('-').map((w) => (/\d/.test(w) ? w.toUpperCase() : w[0].toUpperCase())).join('').slice(0, 10)}-${GRADES[grade].tone.replace('+', 'P')}`;
