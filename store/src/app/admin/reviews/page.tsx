import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { products, reviews } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';
import { Stars } from '@/components/ui/bits';
import { ActionForm, RunButton } from '@/components/admin/ActionForm';
import { PageHead } from '../ui';
import { moderateReview, replyReview } from './actions';

export const metadata = { title: 'Reviews' };

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff('reviews.moderate');
  const status = ['pending', 'approved', 'rejected'].includes((await searchParams).status ?? '') ? (await searchParams).status! : 'pending';
  const d = await db();
  const list = await d.select({ r: reviews, title: products.title, slug: products.slug }).from(reviews).innerJoin(products, eq(products.id, reviews.productId)).where(eq(reviews.status, status)).orderBy(desc(reviews.createdAt)).limit(100);
  return (
    <div>
      <PageHead title="Reviews" intro="Only customers with a delivered order can review. Publish everything that follows the guidelines, negative or not; hide abuse, personal data and spam." />
      <div className="mb-4 flex gap-1.5">{(['pending', 'approved', 'rejected'] as const).map((s) => <Link key={s} href={`/admin/reviews?status=${s}`} className="chip !min-h-8 !text-[13px]" aria-current={status === s ? 'page' : undefined}>{s === 'pending' ? 'Waiting' : s === 'approved' ? 'Published' : 'Hidden'}</Link>)}</div>
      {list.length === 0 ? <p className="rounded-card border border-line bg-white p-8 text-center text-mute">Nothing here.</p> : (
        <ul className="space-y-3">
          {list.map(({ r, title, slug }) => (
            <li key={r.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-3"><Stars value={r.rating} /><Link href={`/laptops/${slug}#reviews`} className="font-semibold hover:underline" target="_blank">{title}</Link></span><span className="text-[13px] text-mute">{r.authorName}{r.city ? `, ${r.city}` : ''} · {r.verified ? 'verified purchase · ' : ''}{formatDate(r.createdAt, true)}</span></div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 whitespace-pre-line text-[14.5px]">{r.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== 'approved' && <RunButton action={moderateReview.bind(null, r.id, 'approved')} label="Publish" className="btn btn-primary btn-sm" />}
                {r.status !== 'rejected' && <RunButton action={moderateReview.bind(null, r.id, 'rejected')} label="Hide" />}
              </div>
              <details className="mt-3"><summary className="cursor-pointer text-[13.5px] text-mute">{r.reply ? 'Edit our public reply' : 'Reply publicly'}</summary>
                <ActionForm action={replyReview.bind(null, r.id)} submit="Save reply" className="mt-2"><textarea name="reply" className="field" defaultValue={r.reply ?? ''} aria-label="Reply" /></ActionForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
