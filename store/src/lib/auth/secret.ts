import crypto from 'node:crypto';
import { isDemo } from '../config';

/** The server secret used to sign codes and links. Required in production. */
export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production' && !isDemo()) throw new Error('AUTH_SECRET is not set');
  return 'dev-only-secret-change-me';
}

export const hmac = (purpose: string, value: string) => crypto.createHmac('sha256', authSecret()).update(`${purpose}:${value}`).digest('base64url');

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
