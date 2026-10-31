'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reviews } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { invalidateProducts } from '@/lib/products';
import { audit } from '@/lib/audit';

export async function moderateReview(id: number, status: 'approved' | 'rejected') {
  const v = await staffCan('reviews.moderate');
  if (!v) return { ok: false, error: 'Your role can’t do that.' };
  const d = await db();
  await d.update(reviews).set({ status, moderatedBy: v.user.id, moderatedAt: new Date() }).where(eq(reviews.id, id));
  await audit(v, `review.${status}`, 'review', id);
  invalidateProducts();
  revalidatePath('/admin/reviews');
  return { ok: true, message: status === 'approved' ? 'Published.' : 'Hidden.' };
}

export async function replyReview(id: number, fd: FormData) {
  const v = await staffCan('reviews.moderate');
  if (!v) return { ok: false, error: 'Your role can’t do that.' };
  const reply = String(fd.get('reply') ?? '').trim().slice(0, 1000);
  const d = await db();
  await d.update(reviews).set({ reply: reply || null }).where(eq(reviews.id, id));
  await audit(v, 'review.reply', 'review', id);
  return { ok: true, message: reply ? 'Reply saved.' : 'Reply removed.' };
}
