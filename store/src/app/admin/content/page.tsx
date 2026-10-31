import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { pages, posts } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';
import { PageHead, Panel } from '../ui';

export const metadata = { title: 'Pages and blog' };

export default async function Content() {
  await requireStaff('content.manage');
  const d = await db();
  const [ps, bs] = await Promise.all([d.select().from(pages).orderBy(pages.slug), d.select().from(posts).orderBy(desc(posts.updatedAt))]);
  return (
    <div>
      <PageHead title="Pages and blog" intro="Policy pages are written in simple Markdown. Values in {{double braces}} (business name, return days…) fill in from Settings automatically." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Policy pages">
          <ul className="divide-y divide-line text-[14px]">{ps.map((p) => (
            <li key={p.slug} className="flex items-center justify-between gap-3 py-2.5"><span><Link href={`/admin/content/pages/${p.slug}`} className="font-semibold hover:underline">{p.title.replace(/\{\{[^}]+\}\}/g, '…')}</Link> <span className="mono text-[12px] text-mute">/{p.slug}</span></span><span className="flex items-center gap-2">{p.needsReview ? <span className="pill pill-wait">Needs legal review</span> : <span className="pill pill-ok">Reviewed</span>}<span className="text-[12px] text-mute">{formatDate(p.updatedAt)}</span></span></li>
          ))}</ul>
        </Panel>
        <Panel title="Blog posts" actions={<Link href="/admin/content/posts/new" className="btn btn-primary btn-sm"><Plus size={15} /> New post</Link>}>
          {bs.length ? <ul className="divide-y divide-line text-[14px]">{bs.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5"><Link href={`/admin/content/posts/${p.id}`} className="font-semibold hover:underline">{p.title}</Link><span className="flex items-center gap-2"><span className={`pill ${p.status === 'published' ? 'pill-ok' : 'pill-done'}`}>{p.status === 'published' ? 'Published' : 'Draft'}</span><span className="text-[12px] text-mute">{formatDate(p.updatedAt)}</span></span></li>
          ))}</ul> : <p className="text-mute">No posts yet. Buying guides (e.g. “ThinkPad T14 vs Latitude 5420”) help people find the store through search.</p>}
        </Panel>
      </div>
    </div>
  );
}
