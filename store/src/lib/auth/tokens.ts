/**
 * Single-use tokens for email links (verify email, reset password). Only the hash is stored.
 */
import crypto from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../db';
import { authTokens } from '../db/schema';

export type TokenPurpose = 'verify_email' | 'reset_password';
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function createToken(userId: string, purpose: TokenPurpose, minutes: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const d = await db();
  // Older unused links of the same kind stop working.
  await d.update(authTokens).set({ usedAt: new Date() }).where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt)));
  await d.insert(authTokens).values({ id: sha256(token), userId, purpose, expiresAt: new Date(Date.now() + minutes * 60_000) });
  return token;
}

/** Checks a token without using it up. */
export async function peekToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const d = await db();
  const [row] = await d.select().from(authTokens)
    .where(and(eq(authTokens.id, sha256(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  return row?.userId ?? null;
}

/** Uses up a token; returns the user id it belongs to, or null if invalid, used or expired. */
export async function consumeToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const d = await db();
  const [row] = await d.update(authTokens).set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, sha256(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}
