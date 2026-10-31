import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { postBySlug } from '@/lib/cms';
import { getViewer } from '@/lib/auth/session';
import { Markdown, stripMarkdown } from '@/lib/markdown';
import { BRAND } from '@/lib/config';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await postBySlug((await params).slug);
  if (!p || p.status !== 'published') return {};
  return { title: p.title, description: p.excerpt || stripMarkdown(p.body).slice(0, 160), alternates: { canonical: `/blog/${p.slug}` }, openGraph: { type: 'article', images: p.cover ? [p.cover] : undefined } };
}

export default async function Post({ params }: Props) {
  const [p, v] = await Promise.all([postBySlug((await params).slug), getViewer()]);
  if (!p || (p.status !== 'published' && !v?.can('content.manage'))) notFound();
  return (
    <article className="wrap-narrow pb-16 pt-10 md:pt-14">
      <Link href="/blog" className="text-[14px] text-mute hover:text-ink">← Guides and news</Link>
      <h1 className="mt-4 text-[36px] leading-[1.05] md:text-[50px]">{p.title}</h1>
      <p className="mt-3 text-[14px] text-mute">{p.authorName} · {formatDate(p.publishedAt ?? p.updatedAt)}{p.status !== 'published' ? ' · draft (only staff can see this)' : ''}</p>
      {p.cover && <div className="well mt-8 aspect-[16/9] rounded-sheet border border-line p-8"><Image src={p.cover} alt="" width={1200} height={675} priority className="h-full w-full object-contain" /></div>}
      <div className="prose-policy mt-10"><Markdown text={p.body} /></div>
      {p.tags.length > 0 && <p className="mt-10 flex flex-wrap gap-2">{p.tags.map((t) => <span key={t} className="pill pill-done">{t}</span>)}</p>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: p.title, datePublished: p.publishedAt?.toISOString(), dateModified: p.updatedAt.toISOString(), author: { '@type': 'Person', name: p.authorName }, publisher: { '@type': 'Organization', name: BRAND.name }, image: p.cover ? `${BRAND.url}${p.cover}` : undefined, mainEntityOfPage: `${BRAND.url}/blog/${p.slug}` }).replace(/</g, '\\u003c') }} />
    </article>
  );
}
