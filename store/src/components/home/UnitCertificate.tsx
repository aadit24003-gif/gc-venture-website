import Link from 'next/link';
import { Check } from 'lucide-react';
import { GRADES, type GradeKey } from '@/lib/config';
import { formatDate, gb } from '@/lib/format';

export type CertUnit = {
  code: string; title: string; slug: string; grade: GradeKey; ramGb: number; ssdGb: number;
  batteryHealth: number | null; batteryCycles: number | null; ssdHealth: number | null;
  inspectedAt: string | null; checks: number; passed: number; cosmeticNotes: string | null;
};

/** A unit's inspection certificate, as a perforated ticket. Shows measured data for one real unit. */
export default function UnitCertificate({ u, compact = false }: { u: CertUnit; compact?: boolean }) {
  const rows: [string, string][] = [
    ['Grade', `${GRADES[u.grade].label} (${GRADES[u.grade].tone})`],
    ['Memory / SSD', `${gb(u.ramGb)} / ${gb(u.ssdGb)}`],
    ...(u.batteryCycles != null ? [['Charge cycles', String(u.batteryCycles)] as [string, string]] : []),
    ...(u.inspectedAt ? [['Inspected', formatDate(new Date(u.inspectedAt))] as [string, string]] : []),
  ];
  return (
    <div className="cert w-full max-w-[360px] shadow-[var(--shadow-pop)]" style={{ ['--cert-bg' as string]: 'var(--color-canvas)' }}>
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <p className="eyebrow">Inspection report</p>
          <p className="mt-1 truncate font-semibold">{u.title}</p>
          <p className="mono mt-0.5 text-[12px] text-mute">Unit {u.code}</p>
        </div>
        <div className="seal shrink-0" aria-hidden="true">{u.passed}/{u.checks}<br />PASSED</div>
      </div>
      <div className="grid grid-cols-2 gap-4 px-5 pb-4">
        {[['Battery health', u.batteryHealth], ['SSD health', u.ssdHealth]].map(([label, v]) => (
          v == null ? null : (
            <div key={label as string}>
              <p className="text-[12px] text-mute">{label}</p>
              <p className="price mt-0.5 text-[26px] leading-none">{v as number}<span className="text-[15px]">%</span></p>
              <div className="meter mt-2"><span style={{ width: `${v}%` }} /></div>
            </div>
          )
        ))}
      </div>
      <div className="perf mx-5" />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 text-[12.5px]">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="text-mute">{k}</dt><dd className="mono mt-0.5 text-ink">{v}</dd></div>
        ))}
      </dl>
      {!compact && u.cosmeticNotes && (
        <p className="mx-5 mb-4 flex gap-2 rounded-xl bg-canvas px-3 py-2.5 text-[13px] text-ink-2"><Check size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {u.cosmeticNotes}</p>
      )}
      {!compact && (
        <Link href={`/units/${u.code}`} className="block border-t border-line px-5 py-3 text-[13px] font-semibold hover:bg-canvas rounded-b-card">See the full report →</Link>
      )}
    </div>
  );
}
