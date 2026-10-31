/**
 * One-time codes: 6 digits, valid 10 minutes, 5 tries, stored only as a hash.
 * Limits: one code per 30 s and 5 per hour for a phone/email; 30 per hour per IP.
 */
import crypto from 'node:crypto';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { otps } from '../db/schema';
import { BRAND, isDemo } from '../config';
import { authSecret } from './secret';
import { sendOtpSms, smsConfigured } from '../providers/sms';
import { emailConfigured, layout, sendEmail } from '../providers/email';

export type Purpose = 'login' | 'student_email' | 'verify_phone';
export type Channel = 'sms' | 'email';

const TTL_MIN = 10;
const MAX_TRIES = 5;

const hash = (dest: string, code: string) => crypto.createHmac('sha256', authSecret()).update(`${dest}:${code}`).digest('hex');

/** Normalises an Indian mobile number or an email address. Returns null if neither. */
export function parseDestination(raw: string): { channel: Channel; destination: string } | null {
  const v = raw.trim();
  if (v.includes('@')) {
    const email = v.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? { channel: 'email', destination: email } : null;
  }
  const d = v.replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(d) ? { channel: 'sms', destination: d } : null;
}

export type SendResult = { ok: true; demoCode?: string } | { ok: false; error: string };

export async function sendCode(input: { purpose: Purpose; channel: Channel; destination: string; ip: string; userId?: string }): Promise<SendResult> {
  const d = await db();
  const hourAgo = new Date(Date.now() - 3_600_000);

  const recent = await d.select({ createdAt: otps.createdAt }).from(otps)
    .where(and(eq(otps.destination, input.destination), gt(otps.createdAt, hourAgo)))
    .orderBy(desc(otps.createdAt));
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < 30_000) {
    return { ok: false, error: 'A code was just sent. Wait 30 seconds before asking for another.' };
  }
  if (recent.length >= 5) return { ok: false, error: 'Too many codes requested. Try again in an hour, or use your email instead.' };

  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(otps).where(and(eq(otps.ip, input.ip), gt(otps.createdAt, hourAgo)));
  if (n >= 30) return { ok: false, error: 'Too many attempts from this network. Try again later.' };

  const demo = isDemo();
  const live = input.channel === 'sms' ? smsConfigured() : emailConfigured();
  if (!live && !demo) {
    return { ok: false, error: input.channel === 'sms' ? 'Phone sign-in is not available yet. Use your email address.' : 'Email sign-in is not available yet.' };
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await d.insert(otps).values({
    purpose: input.purpose, channel: input.channel, destination: input.destination,
    codeHash: hash(input.destination, code), expiresAt: new Date(Date.now() + TTL_MIN * 60_000),
    userId: input.userId ?? null, ip: input.ip,
  });

  try {
    if (input.channel === 'sms') await sendOtpSms(input.destination, code);
    else {
      const what = input.purpose === 'login' ? `sign in to ${BRAND.name}` : input.purpose === 'verify_phone' ? 'confirm your number' : 'confirm your college email';
      await sendEmail({
        to: input.destination,
        subject: `${code} is your ${BRAND.name} code`,
        text: `Your code to ${what} is ${code}. It expires in ${TTL_MIN} minutes. If you did not ask for it, ignore this email.`,
        html: layout(`Your code is ${code}`, `<p style="font-size:15px;line-height:1.6">Use this code to ${what}. It expires in ${TTL_MIN} minutes.</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#101114;margin:20px 0">${code}</p>
<p style="font-size:13px;color:#62666E">If you did not ask for this code, you can ignore this email.</p>`),
      });
    }
  } catch (e) {
    console.error('OTP delivery failed', e);
    return { ok: false, error: 'We could not send the code. Check the number or email and try again.' };
  }
  // In demo mode the code is also returned so it can be shown on screen.
  return { ok: true, ...(demo && !live ? { demoCode: code } : {}) };
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

export async function checkCode(input: { purpose: Purpose; destination: string; code: string }): Promise<VerifyResult> {
  const d = await db();
  const [row] = await d.select().from(otps)
    .where(and(eq(otps.destination, input.destination), eq(otps.purpose, input.purpose), isNull(otps.consumedAt), gt(otps.expiresAt, new Date())))
    .orderBy(desc(otps.createdAt)).limit(1);
  if (!row) return { ok: false, error: 'This code has expired. Ask for a new one.' };
  if (row.attempts >= MAX_TRIES) return { ok: false, error: 'Too many wrong tries. Ask for a new code.' };

  const given = hash(input.destination, input.code.replace(/\D/g, ''));
  const match = given.length === row.codeHash.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(row.codeHash));
  if (!match) {
    await d.update(otps).set({ attempts: row.attempts + 1 }).where(eq(otps.id, row.id));
    const left = MAX_TRIES - row.attempts - 1;
    return { ok: false, error: left > 0 ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Ask for a new code.' };
  }
  await d.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, row.id));
  return { ok: true };
}
