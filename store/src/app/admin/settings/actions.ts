'use server';

import { revalidatePath } from 'next/cache';
import { staffCan } from '@/lib/auth/session';
import { saveSettings } from '@/lib/settings';
import { audit } from '@/lib/audit';

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const paise = (fd: FormData, k: string) => Math.round(Number(s(fd, k) || 0) * 100);

export async function saveBusiness(fd: FormData) {
  const v = await staffCan('settings.manage');
  if (!v) return { ok: false, error: 'Only super admins can change settings.' };
  const r = await saveSettings('business', {
    legalName: s(fd, 'legalName'), gstin: s(fd, 'gstin') || null, cin: s(fd, 'cin') || null, phone: s(fd, 'phone'), whatsapp: s(fd, 'whatsapp').replace(/\D/g, ''),
    email: s(fd, 'email'), hours: s(fd, 'hours'), grievanceName: s(fd, 'grievanceName') || null, grievanceEmail: s(fd, 'grievanceEmail'),
    registeredAddress: s(fd, 'registeredAddress'), returnAddress: s(fd, 'returnAddress'),
  }, v.user.id);
  if (!r.ok) return r;
  const gstin = (r.value as { gstin: string | null }).gstin;
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return { ok: true, message: 'Saved, but the GSTIN format looks wrong. Check it.' };
  await audit(v, 'settings.business', 'settings', 'business', r.value);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function saveShipping(fd: FormData) {
  const v = await staffCan('settings.manage');
  if (!v) return { ok: false, error: 'Only super admins can change settings.' };
  const r = await saveSettings('shipping', {
    flatFee: paise(fd, 'flatFee'), freeAbove: paise(fd, 'freeAbove'), codEnabled: fd.get('codEnabled') === 'on', codFee: paise(fd, 'codFee'), codMax: paise(fd, 'codMax'), bookingEnabled: fd.get('bookingEnabled') === 'on', bookingAmount: paise(fd, 'bookingAmount'),
    dispatchMin: Number(s(fd, 'dispatchMin')), dispatchMax: Number(s(fd, 'dispatchMax')),
    blockedPinPrefixes: s(fd, 'blockedPinPrefixes').split(/[\s,]+/).filter(Boolean), provider: s(fd, 'provider'), pickupPincode: s(fd, 'pickupPincode'),
  }, v.user.id);
  if (!r.ok) return r;
  await audit(v, 'settings.shipping', 'settings', 'shipping', r.value);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function saveTax(fd: FormData) {
  const v = await staffCan('settings.manage');
  if (!v) return { ok: false, error: 'Only super admins can change settings.' };
  const r = await saveSettings('tax', { gstRate: Number(s(fd, 'gstRate')), scheme: s(fd, 'scheme'), sellerState: s(fd, 'sellerState'), hsn: s(fd, 'hsn') }, v.user.id);
  if (!r.ok) return r;
  await audit(v, 'settings.tax', 'settings', 'tax', r.value);
  return { ok: true, message: 'Saved.' };
}
