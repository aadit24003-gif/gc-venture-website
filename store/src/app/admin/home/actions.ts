'use server';

import { revalidatePath } from 'next/cache';
import { staffCan } from '@/lib/auth/session';
import { saveSettings, type HomeSettings } from '@/lib/settings';
import { audit } from '@/lib/audit';

/** Saves the home page's headline and brand tiles (Admin → Home page). */
export async function saveHome(input: HomeSettings) {
  const v = await staffCan('content.manage');
  if (!v) return { ok: false as const, error: 'Your role can’t change the home page.' };
  const r = await saveSettings('home', input, v.user.id);
  if (!r.ok) return r;
  await audit(v, 'settings.home', 'settings', 'home', r.value);
  revalidatePath('/');
  return { ok: true as const, message: 'Home page saved.' };
}
