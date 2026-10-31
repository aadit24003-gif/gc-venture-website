'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { orders, reviews, orderItems } from '@/lib/db/schema';
import { getViewer } from '@/lib/auth/session';
import { canViewOrder, cancelOrder } from '@/lib/orders';
import { CANCELLABLE_BY_CUSTOMER } from '@/lib/order-status';
import { createServiceRequest, type ServiceKind } from '@/lib/service';
import { putPrivate } from '@/lib/providers/storage';
import { invalidateProducts } from '@/lib/products';

async function access(number: string, key?: string | null) {
  const v = await getViewer();
  const d = await db();
  const [o] = await d.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!o || !canViewOrder(v ? { user: v.user } : null, o, key)) return null;
  return { o, v };
}

export async function cancelMyOrder(number: string, reason: string, key?: string | null) {
  const a = await access(number, key);
  if (!a) return { ok: false as const, error: 'Order not found.' };
  if (!CANCELLABLE_BY_CUSTOMER.includes(a.o.status)) return { ok: false as const, error: 'This order is already being packed or has shipped. Contact us, or refuse the delivery.' };
  return cancelOrder(a.o.id, `Cancelled by the customer${reason ? `: ${reason.slice(0, 200)}` : ''}`, a.v ? { user: a.v.user } : null);
}

const Req = z.object({
  kind: z.enum(['return', 'replacement', 'complaint', 'warranty']),
  orderItemId: z.number().int().positive().nullable(),
  reason: z.string().trim().min(3, 'Choose a reason.').max(120),
  details: z.string().trim().min(10, 'Describe what happened in a sentence or two.').max(4000),
});

export async function requestService(number: string, form: FormData, key?: string | null) {
  const a = await access(number, key);
  if (!a) return { ok: false as const, error: 'Order not found.' };
  const parsed = Req.safeParse({ kind: form.get('kind'), orderItemId: form.get('orderItemId') ? Number(form.get('orderItemId')) : null, reason: form.get('reason'), details: form.get('details') });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const photos: string[] = [];
  for (const f of form.getAll('photos').slice(0, 4)) {
    if (!(f instanceof File) || f.size === 0) continue;
    if (f.size > 8 * 1024 * 1024) return { ok: false as const, error: 'Each photo must be under 8 MB.' };
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type)) return { ok: false as const, error: 'Photos must be JPG, PNG, WebP or HEIC.' };
    const sharp = (await import('sharp')).default;
    const buf = await sharp(Buffer.from(await f.arrayBuffer())).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    const keyName = `service/${a.o.number}/${Date.now()}-${photos.length}.jpg`;
    await putPrivate(keyName, buf, 'image/jpeg');
    photos.push(keyName);
  }
  const r = await createServiceRequest({
    userId: a.v?.user.id ?? null, orderId: a.o.id, orderItemId: parsed.data.orderItemId, kind: parsed.data.kind as ServiceKind,
    reason: parsed.data.reason, details: parsed.data.details, photos, email: a.o.email, name: a.o.address.name,
  });
  return r.ok ? { ok: true as const, number: r.request.number } : r;
}

const Rev = z.object({
  productId: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(20, 'Write at least a sentence or two (20 characters).').max(3000),
  city: z.string().trim().max(60).optional(),
});

/** Reviews are only for delivered orders that belong to a signed-in customer; they go to moderation. */
export async function submitReview(number: string, input: z.input<typeof Rev>) {
  const v = await getViewer();
  if (!v) return { ok: false as const, error: 'Sign in to write a review.' };
  const a = await access(number);
  if (!a || a.o.status !== 'delivered') return { ok: false as const, error: 'You can review a laptop after it’s delivered.' };
  const parsed = Rev.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const d = await db();
  const items = await d.select().from(orderItems).where(eq(orderItems.orderId, a.o.id));
  if (!items.some((i) => i.productId === parsed.data.productId)) return { ok: false as const, error: 'That laptop isn’t in this order.' };
  const res = await d.insert(reviews).values({
    productId: parsed.data.productId, userId: v.user.id, orderId: a.o.id, rating: parsed.data.rating, title: parsed.data.title || null,
    body: parsed.data.body, authorName: (v.user.name ?? a.o.address.name).split(' ')[0] + ((v.user.name ?? a.o.address.name).split(' ')[1] ? ` ${(v.user.name ?? a.o.address.name).split(' ')[1][0]}.` : ''),
    city: parsed.data.city || a.o.address.city, verified: true,
  }).onConflictDoNothing().returning({ id: reviews.id });
  invalidateProducts();
  return res.length ? { ok: true as const } : { ok: false as const, error: 'You’ve already reviewed this laptop.' };
}
