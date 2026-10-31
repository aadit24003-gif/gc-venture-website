import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/cms';
import { getViewer } from '@/lib/auth/session';
import { Markdown, headings, stripMarkdown } from '@/lib/markdown';
import { formatDate } from '@/lib/format';

export const POLICY_LINKS = [
  { href: '/warranty', label: 'Warranty' },
  { href: '/returns', label: 'Returns and refunds' },
  { href: '/shipping', label: 'Shipping' },
  { href: '/terms', label: 'Terms of sale' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/grievance', label: 'Grievance officer' },
];

export async function cmsMetadata(slug: string): Promise<Metadata> {
  const p = await getPage(slug);
  return p ? { title: p.title, description: (p.summary ?? stripMarkdown(p.body)).slice(0, 160), alternates: { canonical: `/${slug}` } } : {};
}

/** A policy page stored in the database (editable in Admin → Pages and blog). */
export default async function CmsPage({ slug, aside }: { slug: string; aside?: React.ReactNode }) {
  const [p, v] = await Promise.all([getPage(slug), getViewer()]);
  if (!p) notFound();
  const toc = headings(p.body);
  return (
    <div className="wrap pb-10 pt-10 md:pt-14">
      <header className="max-w-[820px]">
        <p className="eyebrow">Policies</p>
        <h1 className="mt-3 text-[38px] leading-[1.04] md:text-[56px]">{p.title}</h1>
        {p.summary && <p className="mt-4 max-w-[62ch] text-[18px] leading-relaxed text-ink-2">{p.summary}</p>}
        <p className="mt-3 text-[13.5px] text-mute">Last updated {formatDate(p.updatedAt)}</p>
        {v?.isStaff && p.needsReview && <p className="mt-3 inline-block rounded-lg bg-warn-soft px-3 py-1.5 text-[13px] text-warn">Staff only: this text hasn’t been marked as reviewed by a lawyer. <Link href={`/admin/content/pages/${slug}`} className="underline">Edit</Link></p>}
      </header>
      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-[132px]">
            <p className="eyebrow">On this page</p>
            <ul className="mt-3 space-y-2 text-[14px]">{toc.map((h) => <li key={h.id}><a href={`#${h.id}`} className="text-mute hover:text-ink">{h.text}</a></li>)}</ul>
          </div>
        </nav>
        <article className="prose-policy rounded-[24px] border border-line bg-white p-6 md:p-10"><Markdown text={p.body} /></article>
        <aside className="space-y-4 lg:sticky lg:top-[132px] lg:self-start">
          {aside}
          <nav aria-label="Other policies" className="rounded-[20px] border border-line bg-white p-5">
            <p className="eyebrow">Other policies</p>
            <ul className="mt-3 space-y-2 text-[14.5px]">{POLICY_LINKS.filter((l) => l.href !== `/${slug}`).map((l) => <li key={l.href}><Link href={l.href} className="hover:underline">{l.label}</Link></li>)}</ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
