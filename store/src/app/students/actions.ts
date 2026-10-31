'use server';

import { z } from 'zod';
import sharp from 'sharp';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { studentVerifications } from '@/lib/db/schema';
import { getViewer, clientIp } from '@/lib/auth/session';
import { checkCode, sendCode } from '@/lib/auth/otp';
import { approvedUntilFromNow, hasOpenRequest, isAcademicEmail, studentStatus } from '@/lib/students';
import { putPrivate } from '@/lib/providers/storage';
import { layout, sendEmail } from '@/lib/providers/email';
import { notifyApproved } from '@/lib/student-mail';
import { mask } from '@/lib/format';
import { STUDENT } from '@/lib/config';

const Who = z.object({
  fullName: z.string().trim().min(2, 'Enter your name as it appears on your ID.').max(80),
  college: z.string().trim().min(3, 'Enter your college or university.').max(120),
});

type Fail = { ok: false; error: string; field?: string };
const fail = (e: z.ZodError): Fail => ({ ok: false, error: e.issues[0].message, field: String(e.issues[0].path[0] ?? '') });

async function guard(): Promise<{ ok: true; userId: string; email: string | null } | Fail> {
  const v = await getViewer();
  if (!v) return { ok: false, error: 'Sign in first.' };
  const s = await studentStatus(v.user.id);
  if (s.state === 'approved') return { ok: false, error: 'You’re already verified.' };
  if (s.state === 'pending') return { ok: false, error: 'Your earlier request is still being checked.' };
  return { ok: true, userId: v.user.id, email: v.user.email };
}

const EmailStep = Who.extend({ email: z.string().trim().toLowerCase().email('Enter your college email address.') });

export async function sendCollegeCode(input: z.input<typeof EmailStep>) {
  const g = await guard();
  if (!g.ok) return g;
  const p = EmailStep.safeParse(input);
  if (!p.success) return fail(p.error);
  const res = await sendCode({ purpose: 'student_email', channel: 'email', destination: p.data.email, ip: await clientIp(), userId: g.userId });
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const, masked: mask(p.data.email), academic: isAcademicEmail(p.data.email), demoCode: res.demoCode };
}

export async function confirmCollegeCode(input: z.input<typeof EmailStep> & { code: string }) {
  const g = await guard();
  if (!g.ok) return g;
  const p = EmailStep.safeParse(input);
  if (!p.success) return fail(p.error);
  const res = await checkCode({ purpose: 'student_email', destination: p.data.email, code: input.code });
  if (!res.ok) return { ok: false as const, error: res.error };

  const academic = isAcademicEmail(p.data.email);
  const d = await db();
  await d.insert(studentVerifications).values({
    userId: g.userId, method: 'email', status: academic ? 'approved' : 'pending',
    fullName: p.data.fullName, college: p.data.college, collegeEmail: p.data.email, emailVerifiedAt: new Date(),
    ...(academic ? { approvedUntil: approvedUntilFromNow(), reviewedAt: new Date() } : {}),
  });
  if (academic) await notifyApproved(g.email ?? p.data.email, p.data.fullName).catch(() => {});
  return { ok: true as const, approved: academic };
}

const IdStep = Who.extend({
  course: z.string().trim().max(80).optional(),
  gradYear: z.coerce.number().int().min(new Date().getFullYear() - 1, 'Choose the year you finish.').max(new Date().getFullYear() + 7).optional(),
  consent: z.literal('on', { error: 'Confirm that this is your own, current student ID.' }),
});

const MAX_BYTES = 8 * 1024 * 1024;

async function toWebp(file: File): Promise<Buffer> {
  const buf = Buffer.from(await file.arrayBuffer());
  // rotate per EXIF, cap the size, and drop all metadata (location etc.)
  return sharp(buf).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
}

export async function submitStudentId(form: FormData) {
  const g = await guard();
  if (!g.ok) return g;
  const p = IdStep.safeParse({
    fullName: form.get('fullName'), college: form.get('college'), course: form.get('course') || undefined,
    gradYear: form.get('gradYear') || undefined, consent: form.get('consent'),
  });
  if (!p.success) return fail(p.error);

  const front = form.get('front');
  const back = form.get('back');
  if (!(front instanceof File) || front.size === 0) return { ok: false as const, error: 'Add a photo of the front of your ID.', field: 'front' };
  for (const [f, name] of [[front, 'front'], [back, 'back']] as const) {
    if (!(f instanceof File) || f.size === 0) continue;
    if (f.size > MAX_BYTES) return { ok: false as const, error: 'Each photo must be under 8 MB.', field: name };
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type)) return { ok: false as const, error: 'Upload a JPG, PNG or WebP photo.', field: name };
  }
  if (await hasOpenRequest(g.userId)) return { ok: false as const, error: 'Your earlier request is still being checked.' };

  let frontBuf: Buffer;
  let backBuf: Buffer | null = null;
  try {
    frontBuf = await toWebp(front);
    if (back instanceof File && back.size > 0) backBuf = await toWebp(back);
  } catch {
    return { ok: false as const, error: 'That photo couldn’t be read. Take a fresh photo or a screenshot and try again.', field: 'front' };
  }

  const tag = crypto.randomBytes(6).toString('hex');
  const frontKey = `${g.userId}/${tag}-front.webp`;
  const backKey = backBuf ? `${g.userId}/${tag}-back.webp` : null;
  await putPrivate(frontKey, frontBuf, 'image/webp');
  if (backBuf && backKey) await putPrivate(backKey, backBuf, 'image/webp');

  const d = await db();
  await d.insert(studentVerifications).values({
    userId: g.userId, method: 'id_card', status: 'pending',
    fullName: p.data.fullName, college: p.data.college, course: p.data.course ?? null, gradYear: p.data.gradYear ?? null,
    idFrontKey: frontKey, idBackKey: backKey,
  });
  if (g.email) {
    await sendEmail({
      to: g.email,
      subject: 'We received your student ID',
      text: `Thanks ${p.data.fullName}. We check student IDs within one working day and will email you the result.`,
      html: layout('We received your student ID', `<p style="font-size:15px;line-height:1.6">Thanks, ${p.data.fullName}. We check IDs within one working day and will email you as soon as yours is approved. The photo is deleted ${STUDENT.idRetentionDays} days after we decide.</p>`),
    }).catch(() => {});
  }
  return { ok: true as const };
}

/** Used by the page to show the current state without a reload. */
export async function myStudentState() {
  const v = await getViewer();
  if (!v) return { signedIn: false as const };
  const s = await studentStatus(v.user.id);
  return { signedIn: true as const, state: s.state, until: s.row?.approvedUntil?.toISOString() ?? null, reason: s.row?.rejectReason ?? null };
}
