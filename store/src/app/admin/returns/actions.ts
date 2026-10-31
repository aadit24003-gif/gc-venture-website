'use server';

import { revalidatePath } from 'next/cache';
import { staffCan } from '@/lib/auth/session';
import { updateServiceRequest } from '@/lib/service';

export async function updateRequestAction(id: number, fd: FormData) {
  const v = await staffCan('service.manage');
  if (!v) return { ok: false, error: 'Your role can’t do that.' };
  const status = String(fd.get('status') ?? '') || undefined;
  const note = String(fd.get('note') ?? '').trim().slice(0, 1000) || undefined;
  const resolution = String(fd.get('resolution') ?? '').trim().slice(0, 500);
  const internal = fd.get('internal') === 'on';
  if (!status && !note && !resolution) return { ok: false, error: 'Choose a new status or write a note.' };
  const r = await updateServiceRequest(id, { status, note, internal, resolution: resolution || undefined }, v);
  revalidatePath('/admin/returns', 'layout');
  return r.ok ? { ok: true, message: internal ? 'Internal note saved.' : 'Updated. The customer has been emailed.' } : r;
}
