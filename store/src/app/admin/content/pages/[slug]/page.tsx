import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { pages } from '@/lib/db/schema';
import { pageVars } from '@/lib/cms';
import { ActionForm } from '@/components/admin/ActionForm';
import { PageHead, Panel } from '../../../ui';
import { savePage } from '../../actions';

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff('content.manage');
  const { slug } = await params;
  const d = await db();
  const [p] = await d.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!p) notFound();
  const vars = await pageVars();
  return (
    <div>
      <PageHead back={{ href: '/admin/content', label: 'Pages and blog' }} title={`Edit /${p.slug}`} actions={<Link href={`/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm">View page</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel>
          <ActionForm action={savePage.bind(null, p.slug)} submit="Publish">
            <label htmlFor="pg-t" className="label">Title</label><input id="pg-t" name="title" className="field" defaultValue={p.title} />
            <label htmlFor="pg-s" className="label mt-3">Summary (under the title)</label><input id="pg-s" name="summary" className="field" defaultValue={p.summary ?? ''} />
            <label htmlFor="pg-b" className="label mt-3">Text (Markdown)</label><textarea id="pg-b" name="body" className="field mono !min-h-[520px] text-[13px]" defaultValue={p.body} />
            <label className="mt-3 flex items-center gap-2 text-[14px]"><input type="checkbox" name="reviewed" className="check" defaultChecked={!p.needsReview} /> A lawyer has reviewed this text</label>
          </ActionForm>
        </Panel>
        <div className="space-y-6">
          <Panel title="Formatting">
            <ul className="space-y-1 text-[13px] text-mute"><li><code>## Heading</code></li><li><code>- list item</code> / <code>1. step</code></li><li><code>**bold**</code>, <code>*italic*</code></li><li><code>[link text](/warranty)</code></li><li>Blank line = new paragraph</li></ul>
          </Panel>
          <Panel title="Placeholders">
            <dl className="space-y-1.5 text-[12.5px]">{Object.entries(vars).map(([k, v]) => <div key={k}><dt className="mono">{`{{${k}}}`}</dt><dd className="text-mute">{v || '(empty)'}</dd></div>)}</dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
