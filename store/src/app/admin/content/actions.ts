'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pages, posts } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { slugify } from '@/lib/catalogue';
import { audit } from '@/lib/audit';

const deny = { ok: false, error: 'Only super admins can edit content.' };

export async function savePage(slug: string, fd: FormData) {
  const v = await staffCan('content.manage');
  if (!v) return deny;
  const title = String(fd.get('title') ?? '').trim().slice(0, 120);
  const body = String(fd.get('body') ?? '').slice(0, 60_000);
  if (title.length < 2 || body.trim().length < 20) return { ok: false, error: 'Add a title and the page text.' };
  const reviewed = fd.get('reviewed') === 'on';
  const d = await db();
  await d.update(pages).set({ title, summary: String(fd.get('summary') ?? '').trim().slice(0, 300) || null, body, needsReview: !reviewed, updatedBy: v.user.id, updatedAt: new Date() }).where(eq(pages.slug, slug));
  await audit(v, 'page.update', 'page', slug, { reviewed });
  revalidatePath(`/${slug}`);
  return { ok: true, message: reviewed ? 'Published.' : 'Published, still marked as needing legal review.' };
}

export async function savePost(id: number | null, fd: FormData) {
  const v = await staffCan('content.manage');
  if (!v) return deny;
  const title = String(fd.get('title') ?? '').trim().slice(0, 140);
  const body = String(fd.get('body') ?? '').slice(0, 80_000);
  if (title.length < 4 || body.trim().length < 50) return { ok: false, error: 'Add a title and at least a paragraph.' };
  const slug = slugify(String(fd.get('slug') ?? '') || title).slice(0, 80);
  const publish = fd.get('status') === 'published';
  const d = await db();
  const [clash] = await d.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1);
  if (clash && clash.id !== id) return { ok: false, error: 'Another post uses that address. Change the slug.' };
  const values = {
    title, slug, body, excerpt: String(fd.get('excerpt') ?? '').trim().slice(0, 300), cover: String(fd.get('cover') ?? '').trim() || null,
    authorName: String(fd.get('authorName') ?? '').trim().slice(0, 60) || v.user.name || 'Team',
    tags: String(fd.get('tags') ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8),
    status: publish ? 'published' : 'draft', updatedAt: new Date(),
  };
  let postId = id;
  if (id) {
    const [cur] = await d.select().from(posts).where(eq(posts.id, id)).limit(1);
    await d.update(posts).set({ ...values, publishedAt: publish ? cur?.publishedAt ?? new Date() : cur?.publishedAt ?? null }).where(eq(posts.id, id));
  } else {
    const [p] = await d.insert(posts).values({ ...values, publishedAt: publish ? new Date() : null }).returning({ id: posts.id });
    postId = p.id;
  }
  await audit(v, id ? 'post.update' : 'post.create', 'post', postId, { title, status: values.status });
  revalidatePath('/blog', 'layout');
  return { ok: true, message: publish ? 'Published.' : 'Draft saved.', redirect: id ? undefined : `/admin/content/posts/${postId}` };
}

export async function deletePost(id: number) {
  const v = await staffCan('content.manage');
  if (!v) return deny;
  const d = await db();
  await d.delete(posts).where(eq(posts.id, id));
  await audit(v, 'post.delete', 'post', id);
  revalidatePath('/blog', 'layout');
  return { ok: true, message: 'Deleted.', redirect: '/admin/content' };
}
