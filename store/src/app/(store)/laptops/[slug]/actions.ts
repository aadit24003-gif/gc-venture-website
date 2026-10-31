'use server';

import { cookies } from 'next/headers';
import { getViewer } from '@/lib/auth/session';
import { countView } from '@/lib/products';
import { recordView } from '@/lib/shopping';
import { deliveryWindow, shortDate } from '@/lib/delivery';
import { getSettings } from '@/lib/settings';

/** Counts a product page view and remembers it as recently viewed. */
export async function trackView(productId: string) {
  if (!/^[a-z0-9-]{2,120}$/.test(productId)) return;
  await countView(productId).catch(() => {});
  const v = await getViewer();
  if (v) await recordView(v.user.id, productId).catch(() => {});
  else {
    const jar = await cookies();
    const prev = (jar.get('rv')?.value ?? '').split('.').filter((x) => /^[a-z0-9-]{2,120}$/.test(x) && x !== productId);
    jar.set('rv', [productId, ...prev].slice(0, 12).join('.'), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 86_400, secure: process.env.NODE_ENV === 'production' });
  }
}

export type PinResult = { ok: true; window: string; cod: boolean; free: boolean } | { ok: false; error: string };

export async function checkPincode(pin: string): Promise<PinResult> {
  const p = pin.trim();
  if (!/^[1-9]\d{5}$/.test(p)) return { ok: false, error: 'Enter a 6-digit PIN code.' };
  const s = await getSettings();
  if (s.shipping.blockedPinPrefixes.some((x) => p.startsWith(x))) return { ok: false, error: 'Sorry, we don’t deliver to this PIN code yet.' };
  const w = deliveryWindow(p);
  if (!w) return { ok: false, error: 'Enter a 6-digit PIN code.' };
  return { ok: true, window: `${shortDate(w.from)} – ${shortDate(w.to)}`, cod: s.shipping.codEnabled, free: s.shipping.flatFee === 0 };
}
