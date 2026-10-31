'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { notify } from '@/lib/notify';
import { BRAND } from '@/lib/config';
import { hmac } from '@/lib/auth/secret';
import { clientIp } from '@/lib/auth/session';

const Email = z.string().trim().toLowerCase().email().max(200);
const recent = new Map<string, number[]>();

export async function subscribe(raw: string, source = 'footer'): Promise<{ ok: boolean; message: string }> {
  const parsed = Email.safeParse(raw);
  if (!parsed.success) return { ok: false, message: 'Enter a valid email address.' };
  const ip = await clientIp();
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= 10) return { ok: false, message: 'Too many sign-ups from this network. Try again later.' };
  recent.set(ip, [...hits, now]);
  const email = parsed.data;
  const d = await db();
  const [row] = await d.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
  if (row?.status === 'subscribed') return { ok: true, message: 'You’re already on the list.' };
  if (row) await d.update(subscribers).set({ status: 'subscribed', unsubscribedAt: null, source }).where(eq(subscribers.id, row.id));
  else await d.insert(subscribers).values({ email, source });
  const token = hmac('unsubscribe', email).slice(0, 24);
  await notify('newsletter_welcome', { email }, { unsubscribe_url: `${BRAND.url}/newsletter/unsubscribe?e=${encodeURIComponent(email)}&t=${token}` }, 'newsletter');
  return { ok: true, message: 'Thanks. Check your inbox for a welcome note.' };
}
