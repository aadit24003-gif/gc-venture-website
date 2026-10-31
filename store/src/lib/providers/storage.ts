/**
 * Private file storage for student ID photos.
 *
 * - With SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY: a private Supabase Storage bucket
 *   (STORAGE_BUCKET, default "student-ids"), created on first upload.
 * - Otherwise: the local disk (DATA_DIR/uploads, see data-dir.ts), for development.
 *
 * Files are never public; admins view them through /api/admin/student-file.
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import { dataDir } from '../data-dir';

const bucket = () => process.env.STORAGE_BUCKET ?? 'student-ids';
const supa = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? { url: process.env.SUPABASE_URL.replace(/\/$/, ''), key: process.env.SUPABASE_SERVICE_ROLE_KEY }
    : null;

async function localDir() {
  for (const base of [path.join(dataDir(), 'uploads'), path.join(os.tmpdir(), 'store-uploads')]) {
    try {
      await fs.mkdir(base, { recursive: true });
      return base;
    } catch {
      /* read-only filesystem, try the next */
    }
  }
  throw new Error('No writable folder for uploads');
}

const safe = (key: string) => key.replace(/[^a-zA-Z0-9/_.-]/g, '');

let bucketReady = false;
async function ensureBucket(s: { url: string; key: string }) {
  if (bucketReady) return;
  const res = await fetch(`${s.url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s.key}`, apikey: s.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bucket(), name: bucket(), public: false, file_size_limit: 10 * 1024 * 1024 }),
  });
  // 409/400 "already exists" is fine
  if (!res.ok && res.status !== 409 && res.status !== 400) throw new Error(`Storage bucket: ${res.status}`);
  bucketReady = true;
}

export async function putPrivate(key: string, data: Buffer, contentType: string): Promise<void> {
  const s = supa();
  if (s) {
    await ensureBucket(s);
    const res = await fetch(`${s.url}/storage/v1/object/${bucket()}/${safe(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s.key}`, apikey: s.key, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
    return;
  }
  const file = path.join(await localDir(), safe(key));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

export async function getPrivate(key: string): Promise<Buffer | null> {
  const s = supa();
  if (s) {
    const res = await fetch(`${s.url}/storage/v1/object/${bucket()}/${safe(key)}`, {
      headers: { Authorization: `Bearer ${s.key}`, apikey: s.key },
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  try {
    return await fs.readFile(path.join(await localDir(), safe(key)));
  } catch {
    return null;
  }
}

export async function deletePrivate(key: string): Promise<void> {
  const s = supa();
  if (s) {
    await fetch(`${s.url}/storage/v1/object/${bucket()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${s.key}`, apikey: s.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [safe(key)] }),
    });
    return;
  }
  await fs.rm(path.join(await localDir(), safe(key)), { force: true });
}
