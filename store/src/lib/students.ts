import { and, desc, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { deletePrivate } from './providers/storage';
import { db } from './db';
import { studentVerifications } from './db/schema';
import { STUDENT } from './config';

export type StudentRow = typeof studentVerifications.$inferSelect;
export type StudentState = 'approved' | 'pending' | 'rejected' | 'none';

/** The user's most recent verification and what it means right now. */
export async function studentStatus(userId: string): Promise<{ state: StudentState; row: StudentRow | null }> {
  const d = await db();
  const [row] = await d.select().from(studentVerifications).where(eq(studentVerifications.userId, userId)).orderBy(desc(studentVerifications.createdAt)).limit(1);
  if (!row) return { state: 'none', row: null };
  if (row.status === 'approved') {
    return row.approvedUntil && row.approvedUntil > new Date() ? { state: 'approved', row } : { state: 'none', row };
  }
  return { state: row.status as StudentState, row };
}

export async function isVerifiedStudent(userId: string) {
  return (await studentStatus(userId)).state === 'approved';
}

/** True if the address is on a college domain we approve automatically. */
export function isAcademicEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (!domain) return false;
  if (STUDENT.academicSuffixes.some((s) => domain.endsWith(s))) return true;
  return STUDENT.extraDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export const approvedUntilFromNow = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + STUDENT.validityMonths);
  return d;
};

export async function hasOpenRequest(userId: string) {
  const d = await db();
  const rows = await d.select({ id: studentVerifications.id }).from(studentVerifications)
    .where(and(eq(studentVerifications.userId, userId), eq(studentVerifications.status, 'pending'))).limit(1);
  return rows.length > 0;
}

/** Deletes ID photos for requests decided more than STUDENT.idRetentionDays ago. */
export async function purgeStudentFiles() {
  const d = await db();
  const cutoff = new Date(Date.now() - STUDENT.idRetentionDays * 86_400_000);
  const rows = await d.select().from(studentVerifications)
    .where(and(isNotNull(studentVerifications.reviewedAt), lt(studentVerifications.reviewedAt, cutoff), isNull(studentVerifications.filesDeletedAt), isNotNull(studentVerifications.idFrontKey)));
  for (const r of rows) {
    if (r.idFrontKey) await deletePrivate(r.idFrontKey).catch(() => {});
    if (r.idBackKey) await deletePrivate(r.idBackKey).catch(() => {});
    await d.update(studentVerifications).set({ filesDeletedAt: new Date(), idFrontKey: null, idBackKey: null }).where(eq(studentVerifications.id, r.id));
  }
  return { ok: true as const, deleted: rows.length };
}
