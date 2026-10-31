import Link from 'next/link';

/** Layout for help and policy pages: a title band, an optional side panel, and readable prose. */
export default function InfoPage({ title, intro, updated, aside, children, related }: {
  title: string; intro?: React.ReactNode; updated?: string; aside?: React.ReactNode; children: React.ReactNode;
  related?: { href: string; label: string }[];
}) {
  return (
    <div className="wrap pb-10 pt-10 md:pt-16">
      <header className="max-w-[820px]">
        <h1 className="text-[42px] leading-[1.03] md:text-[62px]">{title}</h1>
        {intro && <div className="mt-5 max-w-[62ch] text-[18px] leading-relaxed text-ink/80">{intro}</div>}
        {updated && <p className="mt-3 text-[14px] text-mute">Last updated {updated}</p>}
      </header>
      <div className={`mt-12 grid gap-10 ${aside ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
        <div className="sheet prose-policy p-6 md:p-12">{children}</div>
        {aside && <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">{aside}</aside>}
      </div>
      {related && related.length > 0 && (
        <nav aria-label="Related pages" className="mt-10 flex flex-wrap gap-2">
          {related.map((r) => <Link key={r.href} href={r.href} className="chip">{r.label}</Link>)}
        </nav>
      )}
    </div>
  );
}

export const POLICY_LINKS = [
  { href: '/warranty', label: 'Warranty' },
  { href: '/returns', label: 'Returns and refunds' },
  { href: '/shipping', label: 'Shipping' },
  { href: '/terms', label: 'Terms of sale' },
  { href: '/privacy', label: 'Privacy' },
];
