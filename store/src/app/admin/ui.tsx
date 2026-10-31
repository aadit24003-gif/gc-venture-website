import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PageHead({ title, intro, actions, back }: { title: string; intro?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && <Link href={back.href} className="inline-flex items-center gap-1 text-[13.5px] text-mute hover:text-ink"><ChevronLeft size={15} aria-hidden="true" /> {back.label}</Link>}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-[28px] md:text-[32px]">{title}</h1>{intro && <div className="mt-1 max-w-[80ch] text-[14.5px] text-mute">{intro}</div>}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, children, actions, className = '' }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[18px] border border-line bg-white p-5 ${className}`}>
      {(title || actions) && <div className="mb-4 flex flex-wrap items-center justify-between gap-3">{title && <h2 className="text-[17px]">{title}</h2>}{actions}</div>}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-line bg-white p-4">
      <p className="text-[12.5px] text-mute">{label}</p>
      <p className="price mt-1 text-[24px] leading-tight">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-mute">{sub}</p>}
    </div>
  );
}

/** Data table wrapper with horizontal scroll on small screens. */
export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string | false }) {
  return (
    <div className="overflow-x-auto rounded-[16px] border border-line bg-white" tabIndex={0} role="region" aria-label="Table">
      <table className="w-full min-w-[720px] text-[13.5px]">
        <thead className="border-b border-line bg-canvas/60 text-left text-[12px] uppercase tracking-[0.04em] text-mute">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-mute">{empty}</p>}
    </div>
  );
}

/** GET filter bar: renders a form so filters live in the URL. */
export function Filters({ children, action }: { children: React.ReactNode; action: string }) {
  return <form action={action} className="mb-4 flex flex-wrap items-end gap-2">{children}<button className="btn btn-ghost btn-sm !min-h-9">Apply</button></form>;
}

export function Pager({ page, pages, base, params }: { page: number; pages: number; base: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => `${base}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), page: String(p) } as Record<string, string>)}`;
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-end gap-2 text-[13.5px]">
      {page > 1 && <Link href={href(page - 1)} className="btn btn-ghost btn-sm"><ChevronLeft size={15} /> Previous</Link>}
      <span className="text-mute">Page {page} of {pages}</span>
      {page < pages && <Link href={href(page + 1)} className="btn btn-ghost btn-sm">Next <ChevronRight size={15} /></Link>}
    </nav>
  );
}

export const td = 'px-4 py-3 align-top';
