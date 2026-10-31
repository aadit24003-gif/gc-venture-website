/**
 * Sessions: a random token in an http-only cookie; only its SHA-256 is stored.
 */
import crypto from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db';
import { sessions, users } from '../db/schema';
import { adminLists } from '../config';

const COOKIE = 'sid';
const DAYS = 60;

export type User = typeof users.$inferSelect;
export type Viewer = { user: User; isAdmin: boolean };

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export function isAdminUser(u: Pick<User, 'email' | 'phone'>): boolean {
  const { emails, phones } = adminLists();
  return (!!u.email && emails.includes(u.email.toLowerCase())) || (!!u.phone && phones.includes(u.phone));
}

/** The signed-in user for this request, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const d = await db();
  const rows = await d
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const user = rows[0]?.user;
  return user ? { user, isAdmin: isAdminUser(user) } : null;
});

export async function requireViewer(next = '/account'): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(next)}`);
  return v;
}

export async function requireAdmin(): Promise<Viewer> {
  const v = await requireViewer('/admin');
  if (!v.isAdmin) redirect('/account?notice=admin');
  return v;
}

/** Starts a session (call from a Server Action or Route Handler). */
export async function startSession(userId: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + DAYS * 86_400_000);
  const ua = (await headers()).get('user-agent')?.slice(0, 200) ?? null;
  const d = await db();
  await d.insert(sessions).values({ id: sha256(token), userId, expiresAt, userAgent: ua });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const d = await db();
    await d.delete(sessions).where(eq(sessions.id, sha256(token)));
  }
  jar.delete(COOKIE);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '0.0.0.0').trim();
}
