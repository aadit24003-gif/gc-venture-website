'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { studentVerifications, users } from '@/lib/db/schema';
import { staffCan } from '@/lib/auth/session';
import { approvedUntilFromNow } from '@/lib/students';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';
import { BRAND } from '@/lib/config';
import { formatDate } from '@/lib/format';

export async function decideStudent(id: number, decision: 'approve' | 'reject', reason?: string) {
  const v = await staffCan('students.review');
  if (!v) return { ok: false as const, error: 'Your role can’t do that.' };
  const d = await db();
  const [row] = await d.select().from(studentVerifications).where(eq(studentVerifications.id, id)).limit(1);
  if (!row || row.status !== 'pending') return { ok: false as const, error: 'Already decided.' };
  const [u] = await d.select().from(users).where(eq(users.id, row.userId)).limit(1);
  const to = u?.email ?? row.collegeEmail;
  if (decision === 'approve') {
    const until = approvedUntilFromNow();
    await d.update(studentVerifications).set({ status: 'approved', approvedUntil: until, reviewerId: v.user.id, reviewedAt: new Date() }).where(eq(studentVerifications.id, id));
    if (to) await notify('student_approved', { email: to }, { name: row.fullName, valid_until: formatDate(until), shop_url: `${BRAND.url}/category/student` }, `student-${id}`);
  } else {
    const why = (reason ?? '').trim().slice(0, 200) || 'We could not confirm your student status from the details provided.';
    await d.update(studentVerifications).set({ status: 'rejected', rejectReason: why, reviewerId: v.user.id, reviewedAt: new Date() }).where(eq(studentVerifications.id, id));
    if (to) await notify('student_rejected', { email: to }, { name: row.fullName, reason: why, retry_url: `${BRAND.url}/students` }, `student-${id}`);
  }
  await audit(v, `student.${decision}`, 'student_verification', id, { reason });
  revalidatePath('/admin/students');
  return { ok: true as const };
}
