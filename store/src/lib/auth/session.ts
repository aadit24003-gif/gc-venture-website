/**
 * Sessions: a random token in an http-only cookie; only its SHA-256 is stored.
 */
import crypto from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, gt, ne } from 'drizzle-orm';
import { db } from '../db';
import { sessions, users, type Role } from '../db/schema';
import { adminLists } from '../config';
import { can, isStaffRole, type Permission } from '../rbac';

const COOKIE = 'sid';
const DAYS = 60;

export type User = typeof users.$inferSelect;
export type Viewer = {
  user: User;
  /** Effective role: bootstrap admins (ADMIN_EMAILS / ADMIN_PHONES) are super admins. */
  role: Role;
  isStaff: boolean;
  /** Kept for older code: true for any staff member. */
  isAdmin: boolean;
  can: (p: Permission) => boolean;
};

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export function isBootstrapAdmin(u: Pick<User, 'email' | 'phone'>): boolean {
  const { emails, phones } = adminLists();
  return (!!u.email && emails.includes(u.email.toLowerCase())) || (!!u.phone && phones.includes(u.phone));
}
/** @deprecated use viewer.isStaff */
export const isAdminUser = isBootstrapAdmin;

export function effectiveRole(u: Pick<User, 'email' | 'phone' | 'role'>): Role {
  return isBootstrapAdmin(u) ? 'super_admin' : u.role;
}

function toViewer(user: User): Viewer {
  const role = effectiveRole(user);
  return { user, role, isStaff: isStaffRole(role), isAdmin: isStaffRole(role), can: (p) => can(role, p) };
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
  if (!user || user.disabledAt) return null;
  return toViewer(user);
});

export async function requireViewer(next = '/account'): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(next)}`);
  return v;
}

/** For staff pages: signed in with the given permission, or redirected. */
export async function requireStaff(permission: Permission = 'dashboard.view', next = '/admin'): Promise<Viewer> {
  const v = await requireViewer(next);
  if (!v.isStaff) redirect('/account?notice=admin');
  if (!v.can(permission)) redirect('/admin?notice=forbidden');
  return v;
}

/** @deprecated use requireStaff */
export const requireAdmin = () => requireStaff('dashboard.view');

/** For server actions: the viewer if allowed, else null (the action returns an error). */
export async function staffCan(permission: Permission): Promise<Viewer | null> {
  const v = await getViewer();
  return v && v.can(permission) ? v : null;
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
  // A guest cart in this browser joins the account's cart.
  const { mergeGuestCart } = await import('../cart');
  await mergeGuestCart(userId).catch((e) => console.error('cart merge', e));
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

/** Signs the user out everywhere except this browser (after a password change). */
export async function endOtherSessions(userId: string) {
  const token = (await cookies()).get(COOKIE)?.value;
  const d = await db();
  if (token) await d.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, sha256(token))));
  else await d.delete(sessions).where(eq(sessions.userId, userId));
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '0.0.0.0').trim();
}
