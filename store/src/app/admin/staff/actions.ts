'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sessions, users, ROLES, type Role } from '@/lib/db/schema';
import { staffCan, isBootstrapAdmin } from '@/lib/auth/session';
import { parseDestination } from '@/lib/auth/otp';
import { audit } from '@/lib/audit';

const deny = { ok: false, error: 'Only super admins can manage staff.' };

export async function setRole(userId: string, fd: FormData) {
  const v = await staffCan('staff.manage');
  if (!v) return deny;
  const role = String(fd.get('role') ?? '') as Role;
  if (!(ROLES as readonly string[]).includes(role)) return { ok: false, error: 'Choose a role.' };
  if (userId === v.user.id && role !== 'super_admin') return { ok: false, error: 'You can’t remove your own super admin role.' };
  const d = await db();
  const [u] = await d.update(users).set({ role }).where(eq(users.id, userId)).returning();
  if (!u) return { ok: false, error: 'User not found.' };
  await audit(v, 'staff.role', 'user', userId, { role });
  revalidatePath('/admin/staff');
  return { ok: true, message: isBootstrapAdmin(u) ? 'Saved. This person is also listed in ADMIN_EMAILS/ADMIN_PHONES, so they stay a super admin.' : 'Role updated.' };
}

export async function addStaff(fd: FormData) {
  const v = await staffCan('staff.manage');
  if (!v) return deny;
  const dest = parseDestination(String(fd.get('contact') ?? ''));
  const role = String(fd.get('role') ?? '') as Role;
  const name = String(fd.get('name') ?? '').trim().slice(0, 80) || null;
  if (!dest) return { ok: false, error: 'Enter their email or 10-digit mobile number.' };
  if (!(ROLES as readonly string[]).includes(role) || role === 'customer') return { ok: false, error: 'Choose a staff role.' };
  const d = await db();
  const col = dest.channel === 'sms' ? users.phone : users.email;
  let [u] = await d.select().from(users).where(eq(col, dest.destination)).limit(1);
  if (u) [u] = await d.update(users).set({ role, name: u.name ?? name }).where(eq(users.id, u.id)).returning();
  else [u] = await d.insert(users).values({ ...(dest.channel === 'sms' ? { phone: dest.destination } : { email: dest.destination }), role, name }).returning();
  await audit(v, 'staff.add', 'user', u.id, { role, contact: dest.destination });
  revalidatePath('/admin/staff');
  return { ok: true, message: `Done. They sign in with a one-time code to ${dest.destination}.` };
}

export async function setDisabled(userId: string, disabled: boolean) {
  const v = await staffCan('staff.manage');
  if (!v) return deny;
  if (userId === v.user.id) return { ok: false, error: 'You can’t switch off your own account.' };
  const d = await db();
  await d.update(users).set({ disabledAt: disabled ? new Date() : null }).where(eq(users.id, userId));
  if (disabled) await d.delete(sessions).where(eq(sessions.userId, userId));
  await audit(v, disabled ? 'user.disable' : 'user.enable', 'user', userId);
  revalidatePath('/admin/customers', 'layout');
  return { ok: true, message: disabled ? 'Account switched off and signed out everywhere.' : 'Account switched back on.' };
}
