import { and, desc, eq } from 'drizzle-orm';
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
