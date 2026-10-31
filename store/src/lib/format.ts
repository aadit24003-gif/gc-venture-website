/** ₹ with Indian digit grouping. Input in paise. */
export function rupees(paise: number, opts: { decimals?: boolean } = {}): string {
  const value = paise / 100;
  return '₹' + value.toLocaleString('en-IN', {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  });
}

/** Digits only, e.g. "31,999" (no symbol), for large display prices. */
export const digits = (paise: number) => Math.round(paise / 100).toLocaleString('en-IN');

export const gb = (n: number) => (n >= 1024 ? `${n / 1024} TB` : `${n} GB`);

export function formatDate(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    timeZone: 'Asia/Kolkata',
  });
}

/** "+91 96547 50874" from any Indian number. */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p;
}

/** Hides the middle of a phone or email for display, e.g. "98•••••210" or "a•••@gmail.com". */
export function mask(dest: string): string {
  if (dest.includes('@')) {
    const [u, d] = dest.split('@');
    return `${u.slice(0, 1)}•••@${d}`;
  }
  const d = dest.replace(/\D/g, '').slice(-10);
  return `${d.slice(0, 2)}•••••${d.slice(-3)}`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
