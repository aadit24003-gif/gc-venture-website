'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { checkCode, parseDestination, sendCode } from '@/lib/auth/otp';
import { clientIp, endSession, getViewer, startSession } from '@/lib/auth/session';
import { mask } from '@/lib/format';
import { redirect } from 'next/navigation';

export type RequestState =
  | { ok: true; destination: string; channel: 'sms' | 'email'; masked: string; demoCode?: string }
  | { ok: false; error: string };

export async function requestLoginCode(raw: string): Promise<RequestState> {
  const dest = parseDestination(raw ?? '');
  if (!dest) return { ok: false, error: 'Enter a 10-digit mobile number or an email address.' };
  const res = await sendCode({ purpose: 'login', ...dest, ip: await clientIp() });
  if (!res.ok) return res;
  return { ok: true, ...dest, masked: mask(dest.destination), demoCode: res.demoCode };
}

export type VerifyState = { ok: true; needsName: boolean } | { ok: false; error: string };

export async function verifyLoginCode(destination: string, code: string): Promise<VerifyState> {
  const dest = parseDestination(destination);
  if (!dest) return { ok: false, error: 'Start again with your mobile number or email.' };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: 'Enter all 6 digits.' };
  const res = await checkCode({ purpose: 'login', destination: dest.destination, code });
  if (!res.ok) return res;

  const d = await db();
  const col = dest.channel === 'sms' ? users.phone : users.email;
  let [user] = await d.select().from(users).where(eq(col, dest.destination)).limit(1);
  if (!user) {
    [user] = await d.insert(users).values(dest.channel === 'sms' ? { phone: dest.destination } : { email: dest.destination }).returning();
  }
  await d.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await startSession(user.id);
  return { ok: true, needsName: !user.name };
}

export async function saveName(name: string): Promise<{ ok: boolean; error?: string }> {
  const v = await getViewer();
  if (!v) return { ok: false, error: 'Your session ended. Sign in again.' };
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (clean.length < 2) return { ok: false, error: 'Enter your name.' };
  const d = await db();
  await d.update(users).set({ name: clean }).where(eq(users.id, v.user.id));
  return { ok: true };
}

export async function signOut() {
  await endSession();
  redirect('/');
}
