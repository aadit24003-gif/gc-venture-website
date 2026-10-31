import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { ActionForm, RunButton } from '@/components/admin/ActionForm';
import { PageHead, Panel } from '../../../ui';
import { deletePost, savePost } from '../../actions';

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireStaff('content.manage');
  const { id } = await params;
  const isNew = id === 'new';
  const d = await db();
  const [p] = isNew ? [null] : await d.select().from(posts).where(eq(posts.id, Number(id) || 0)).limit(1);
  if (!isNew && !p) notFound();
  return (
    <div>
      <PageHead back={{ href: '/admin/content', label: 'Pages and blog' }} title={isNew ? 'New post' : p!.title}
        actions={p ? <>{p.status === 'published' && <Link href={`/blog/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm">View</Link>}<RunButton action={deletePost.bind(null, p.id)} label="Delete" confirmText="Delete this post?" className="btn btn-quiet btn-sm text-bad" /></> : undefined} />
      <Panel>
        <ActionForm action={savePost.bind(null, p?.id ?? null)} submit="Save">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="po-t" className="label">Title</label><input id="po-t" name="title" className="field" defaultValue={p?.title ?? ''} /></div>
            <div><label htmlFor="po-s" className="label">Address (slug)</label><input id="po-s" name="slug" className="field mono" defaultValue={p?.slug ?? ''} placeholder="made from the title if empty" /></div>
            <div><label htmlFor="po-a" className="label">Author</label><input id="po-a" name="authorName" className="field" defaultValue={p?.authorName ?? v.user.name ?? ''} /></div>
            <div className="sm:col-span-2"><label htmlFor="po-e" className="label">Excerpt (for lists and search results)</label><input id="po-e" name="excerpt" className="field" defaultValue={p?.excerpt ?? ''} /></div>
            <div><label htmlFor="po-c" className="label">Cover image path (optional)</label><input id="po-c" name="cover" className="field mono" defaultValue={p?.cover ?? ''} placeholder="/products/lenovo-thinkpad-t14-gen-2/1.webp" /></div>
            <div><label htmlFor="po-g" className="label">Tags</label><input id="po-g" name="tags" className="field" defaultValue={p?.tags.join(', ') ?? ''} placeholder="buying guide, thinkpad" /></div>
            <div className="sm:col-span-2"><label htmlFor="po-b" className="label">Text (Markdown)</label><textarea id="po-b" name="body" className="field mono !min-h-[460px] text-[13px]" defaultValue={p?.body ?? ''} /></div>
            <div><label htmlFor="po-st" className="label">Status</label><select id="po-st" name="status" className="field" defaultValue={p?.status ?? 'draft'}><option value="draft">Draft</option><option value="published">Published</option></select></div>
          </div>
        </ActionForm>
      </Panel>
    </div>
  );
}
