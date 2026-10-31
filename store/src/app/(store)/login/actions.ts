'use server';

import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { otps, users } from '@/lib/db/schema';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/auth/password';
import { consumeToken, createToken } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/auth/verify';
import { notify } from '@/lib/notify';
import { BRAND } from '@/lib/config';
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
  if (user.disabledAt) return { ok: false, error: 'This account is switched off. Contact us for help.' };
  // A correct code proves the customer owns this number or email.
  await d.update(users).set({
    lastLoginAt: new Date(),
    ...(dest.channel === 'sms' && !user.phoneVerifiedAt ? { phoneVerifiedAt: new Date() } : {}),
    ...(dest.channel === 'email' && !user.emailVerifiedAt ? { emailVerifiedAt: new Date() } : {}),
  }).where(eq(users.id, user.id));
  await startSession(user.id);
  return { ok: true, needsName: !user.name };
}

/* ── Passwords ─────────────────────────────────────────────── */

const FAIL = 'pw_fail';

async function tooManyFailures(destination: string, ip: string) {
  const d = await db();
  const since = new Date(Date.now() - 15 * 60_000);
  const [[a], [b]] = await Promise.all([
    d.select({ n: sql<number>`count(*)::int` }).from(otps).where(and(eq(otps.purpose, FAIL), eq(otps.destination, destination), gt(otps.createdAt, since))),
    d.select({ n: sql<number>`count(*)::int` }).from(otps).where(and(eq(otps.purpose, FAIL), eq(otps.ip, ip), gt(otps.createdAt, since))),
  ]);
  return a.n >= 8 || b.n >= 30;
}

async function recordFailure(destination: string, ip: string) {
  const d = await db();
  await d.insert(otps).values({ purpose: FAIL, channel: 'password', destination, codeHash: '-', expiresAt: new Date(), ip, consumedAt: new Date() });
}

export async function loginWithPassword(identifier: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const dest = parseDestination(identifier ?? '');
  if (!dest) return { ok: false, error: 'Enter your email or 10-digit mobile number.' };
  if (!password) return { ok: false, error: 'Enter your password.' };
  const ip = await clientIp();
  if (await tooManyFailures(dest.destination, ip)) return { ok: false, error: 'Too many wrong attempts. Wait 15 minutes, or sign in with a one-time code.' };
  const d = await db();
  const col = dest.channel === 'sms' ? users.phone : users.email;
  const [user] = await d.select().from(users).where(eq(col, dest.destination)).limit(1);
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  if (!user || !ok) {
    await recordFailure(dest.destination, ip);
    return { ok: false, error: user && !user.passwordHash ? 'This account doesn’t have a password yet. Sign in with a one-time code, then set one in your profile.' : 'That email or number and password don’t match.' };
  }
  if (user.disabledAt) return { ok: false, error: 'This account is switched off. Contact us for help.' };
  await d.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await startSession(user.id);
  return { ok: true };
}

const Register = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().transform((p) => p.replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '')).refine((p) => p === '' || /^[6-9]\d{9}$/.test(p), 'Enter a 10-digit mobile number, or leave it empty.'),
  password: z.string(),
  marketing: z.boolean(),
});


export async function registerAccount(input: z.input<typeof Register>): Promise<{ ok: true } | { ok: false; error: string; field?: string }> {
  const parsed = Register.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0]) };
  const r = parsed.data;
  const problem = passwordProblem(r.password, [r.email, r.phone]);
  if (problem) return { ok: false, error: problem, field: 'password' };
  const ip = await clientIp();
  if (await tooManyFailures(`register:${ip}`, ip)) return { ok: false, error: 'Too many sign-ups from this network. Try again later.' };
  const d = await db();
  const [byEmail] = await d.select({ id: users.id }).from(users).where(eq(users.email, r.email)).limit(1);
  if (byEmail) return { ok: false, error: 'There’s already an account with this email. Sign in instead (you can use a one-time code), or reset your password.', field: 'email' };
  if (r.phone) {
    const [byPhone] = await d.select({ id: users.id }).from(users).where(eq(users.phone, r.phone)).limit(1);
    if (byPhone) return { ok: false, error: 'This mobile number is already on an account. Sign in with it instead.', field: 'phone' };
  }
  const [user] = await d.insert(users).values({ name: r.name, email: r.email, phone: r.phone || null, passwordHash: await hashPassword(r.password), marketingOptIn: r.marketing }).returning();
  await recordFailure(`register:${ip}`, ip); // counts sign-ups per network, not a failure
  await startSession(user.id);
  await sendVerificationEmail(user.id, r.email, r.name);
  return { ok: true };
}

export async function resendVerification(): Promise<{ ok: boolean; message: string }> {
  const v = await getViewer();
  if (!v?.user.email) return { ok: false, message: 'Add an email address to your account first.' };
  if (v.user.emailVerifiedAt) return { ok: true, message: 'Your email is already confirmed.' };
  await sendVerificationEmail(v.user.id, v.user.email, v.user.name);
  return { ok: true, message: `We sent a new link to ${v.user.email}.` };
}

/** Always answers the same way, so it can't be used to find out who has an account. */
export async function requestPasswordReset(email: string): Promise<{ ok: true; message: string }> {
  const e = z.string().trim().toLowerCase().email().safeParse(email);
  const message = 'If an account uses that email, we’ve sent a link to reset the password. It works for 30 minutes.';
  if (!e.success) return { ok: true, message };
  const ip = await clientIp();
  if (await tooManyFailures(`reset:${e.data}`, ip)) return { ok: true, message };
  await recordFailure(`reset:${e.data}`, ip);
  const d = await db();
  const [user] = await d.select().from(users).where(eq(users.email, e.data)).limit(1);
  if (user && !user.disabledAt) {
    const token = await createToken(user.id, 'reset_password', 30);
    await notify('password_reset', { email: e.data }, { name: user.name ?? 'there', link: `${BRAND.url}/reset/${token}` }, 'reset');
  }
  return { ok: true, message };
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem };
  const userId = await consumeToken(token, 'reset_password');
  if (!userId) return { ok: false, error: 'This link has expired or was already used. Ask for a new one.' };
  const d = await db();
  const [u] = await d.update(users).set({ passwordHash: await hashPassword(password), emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` }).where(eq(users.id, userId)).returning();
  const { sessions } = await import('@/lib/db/schema');
  await d.delete(sessions).where(eq(sessions.userId, userId));
  if (!u.disabledAt) await startSession(userId);
  return { ok: true };
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
