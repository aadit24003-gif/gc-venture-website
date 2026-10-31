'use client';

/**
 * Small, dependency-free charts for the admin. One series each, so no legend: the panel title
 * names what is plotted. Columns ≤ 24px with a 4px rounded data end and a square baseline,
 * hairline grid, hover tooltip on every column, and a table view for each chart.
 */
import { useState } from 'react';

const compact = (paise: number) => {
  const r = paise / 100;
  if (r >= 1_00_00_000) return `₹${(r / 1_00_00_000).toFixed(1)}Cr`;
  if (r >= 1_00_000) return `₹${(r / 1_00_000).toFixed(1)}L`;
  if (r >= 1000) return `₹${Math.round(r / 1000)}K`;
  return `₹${Math.round(r)}`;
};
const full = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= v) ?? v;
};

export function DailyRevenue({ days }: { days: { day: string; revenue: number; orders: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 240, L = 52, B = 26, T = 10;
  const max = niceMax(Math.max(...days.map((d) => d.revenue), 0));
  const slot = (W - L) / Math.max(days.length, 1);
  const bw = Math.min(24, Math.max(3, slot - 2));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.ceil(days.length / 8);
  const h = hover != null ? days[hover] : null;
  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Revenue per day, ${days.length} days`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-mute)" fontFamily="var(--font-mono)">{compact(t)}</text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = L + i * slot + (slot - bw) / 2;
            const top = y(d.revenue);
            const hgt = Math.max(0, H - B - top);
            const r = Math.min(4, hgt, bw / 2);
            return (
              <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.day}: ${full(d.revenue)}, ${d.orders} orders`}>
                <rect x={L + i * slot} y={T} width={slot} height={H - T - B} fill="transparent" />
                {hgt > 0 && <path d={`M${x},${H - B} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${H - B} Z`} fill={hover === i ? 'var(--color-ink)' : 'var(--color-ink-3)'} />}
                {i % labelEvery === 0 && <text x={L + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--color-mute)" fontFamily="var(--font-mono)">{d.day.slice(5)}</text>}
              </g>
            );
          })}
          <line x1={L} x2={W} y1={H - B} y2={H - B} stroke="var(--color-line-2)" strokeWidth="1" />
        </svg>
        {h && hover != null && (
          <div className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] shadow-[var(--shadow-lift)]" style={{ left: `${Math.min(80, ((L + hover * slot) / W) * 100)}%` }}>
            <p className="mono text-mute">{h.day}</p>
            <p className="font-semibold">{full(h.revenue)}</p>
            <p className="text-mute">{h.orders} {h.orders === 1 ? 'order' : 'orders'}</p>
          </div>
        )}
      </div>
      <details className="mt-2 text-[13px]">
        <summary className="cursor-pointer text-mute">View as table</summary>
        <table className="mt-2 w-full">
          <thead><tr className="text-left text-mute"><th className="py-1 font-medium">Day</th><th className="py-1 text-right font-medium">Revenue</th><th className="py-1 text-right font-medium">Orders</th></tr></thead>
          <tbody>{days.filter((d) => d.orders).map((d) => <tr key={d.day} className="border-t border-line"><td className="mono py-1">{d.day}</td><td className="mono py-1 text-right">{full(d.revenue)}</td><td className="mono py-1 text-right">{d.orders}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

/** Horizontal bars for one measure across categories, value at the tip. */
export function Bars({ rows, format = 'money' }: { rows: { label: string; value: number; note?: string }[]; format?: 'money' | 'count' }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const fmt = (v: number) => (format === 'money' ? full(v) : v.toLocaleString('en-IN'));
  if (!rows.length) return <p className="text-[13.5px] text-mute">No data in this period.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${fmt(r.value)}${r.note ? ` (${r.note})` : ''}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]"><span className="truncate">{r.label}</span><span className="mono shrink-0">{fmt(r.value)}{r.note ? <span className="text-mute"> · {r.note}</span> : null}</span></div>
          <div className="mt-1 h-[10px] rounded-r-[4px] bg-canvas"><div className="h-full rounded-r-[4px] bg-ink-3" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
