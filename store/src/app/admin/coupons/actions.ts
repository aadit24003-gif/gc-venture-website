'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { audit } from '@/lib/audit';

const CouponInput = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, 'Codes use 3–24 letters, numbers or dashes.'),
  kind: z.enum(['percent', 'flat']),
  value: z.number().positive('Enter the discount.'),
  minSubtotal: z.number().min(0),
  maxDiscount: z.number().positive().nullable(),
  usageLimit: z.number().int().positive().nullable(),
  perUserLimit: z.number().int().positive().nullable(),
  firstOrderOnly: z.boolean(),
  productIds: z.array(z.string()).max(50),
  brands: z.array(z.string()).max(10),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  note: z.string().trim().max(120).nullable(),
  active: z.boolean(),
});
export type CouponForm = z.input<typeof CouponInput>;

export async function saveCoupon(input: CouponForm, isNew: boolean) {
  const v = await staffCan('coupons.manage');
  if (!v) return { ok: false as const, error: 'Your role can’t do that.' };
  const p = CouponInput.safeParse(input);
  if (!p.success) return { ok: false as const, error: p.error.issues[0].message };
  const c = p.data;
  if (c.kind === 'percent' && c.value > 50) return { ok: false as const, error: 'Percentage coupons are capped at 50%.' };
  if (c.startsAt && c.endsAt && c.startsAt > c.endsAt) return { ok: false as const, error: 'The end date is before the start date.' };
  const d = await db();
  const [exists] = await d.select({ code: coupons.code }).from(coupons).where(eq(coupons.code, c.code));
  if (isNew && exists) return { ok: false as const, error: 'A coupon with this code already exists.' };
  if (!isNew && !exists) return { ok: false as const, error: 'Coupon not found.' };
  const values = {
    kind: c.kind, value: c.kind === 'percent' ? Math.round(c.value) : Math.round(c.value * 100),
    minSubtotal: Math.round(c.minSubtotal * 100), maxDiscount: c.maxDiscount ? Math.round(c.maxDiscount * 100) : null,
    usageLimit: c.usageLimit, perUserLimit: c.perUserLimit, firstOrderOnly: c.firstOrderOnly, productIds: c.productIds, brands: c.brands,
    startsAt: c.startsAt ? new Date(`${c.startsAt}T00:00:00+05:30`) : null, endsAt: c.endsAt ? new Date(`${c.endsAt}T23:59:59+05:30`) : null,
    note: c.note, active: c.active,
  };
  if (isNew) await d.insert(coupons).values({ code: c.code, ...values });
  else await d.update(coupons).set(values).where(eq(coupons.code, c.code));
  await audit(v, isNew ? 'coupon.create' : 'coupon.update', 'coupon', c.code, c);
  revalidatePath('/admin/coupons');
  return { ok: true as const };
}

export async function toggleCoupon(code: string, active: boolean) {
  const v = await staffCan('coupons.manage');
  if (!v) return { ok: false as const, error: 'Your role can’t do that.' };
  const d = await db();
  await d.update(coupons).set({ active }).where(eq(coupons.code, code));
  await audit(v, 'coupon.toggle', 'coupon', code, { active });
  revalidatePath('/admin/coupons');
  return { ok: true as const };
}
