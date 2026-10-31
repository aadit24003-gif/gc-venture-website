/**
 * Downloads each model's official manufacturer photos (store/scripts/product-image-sources.json),
 * flattens transparency onto white, trims empty margins, resizes to at most 1600 px and saves
 * WebP files to store/public/products/<slug>/<n>.webp, plus public/products/manifest.json,
 * which the catalogue reads.
 *
 * Each entry in a model's `images` is one photo slot: a list of candidate URLs tried in order
 * (larger renditions first). A slot is skipped if none of its candidates download.
 *
 * Run by .github/workflows/store-product-images.yml, or locally with network access:
 *   node store/scripts/fetch-product-images.mjs            (all models)
 *   node store/scripts/fetch-product-images.mjs <slug>...  (only these)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const sources = JSON.parse(await fs.readFile(path.join(here, 'product-image-sources.json'), 'utf8'));
const outDir = path.join(root, 'public', 'products');
const manifestPath = path.join(outDir, 'manifest.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const only = process.argv.slice(2);

let previous = { models: {} };
try { previous = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch { /* first run */ }

async function download(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*', Referer: new URL(url).origin + '/' },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) throw new Error(`not an image (${type || 'no type'})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  if (!meta.width || meta.width < 240) throw new Error(`too small (${meta.width}px)`);
  return buf;
}

async function convert(buf) {
  // Flatten first so transparent PNGs trim against white, then trim and pad evenly.
  const flat = await sharp(buf).flatten({ background: '#ffffff' }).png().toBuffer();
  let trimmed;
  try { trimmed = await sharp(flat).trim({ background: '#ffffff', threshold: 10 }).toBuffer(); } catch { trimmed = flat; }
  return sharp(trimmed)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background: '#ffffff' })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });
}

const manifest = { ...previous.models };
const failures = [];
for (const [slug, entry] of Object.entries(sources.models)) {
  if (only.length && !only.includes(slug)) continue;
  const slots = (entry.images ?? []).map((s) => (Array.isArray(s) ? s : [s]));
  const saved = [];
  await fs.rm(path.join(outDir, slug), { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, slug), { recursive: true });
  for (const candidates of slots) {
    let done = false;
    const errors = [];
    for (const url of candidates) {
      try {
        const { data, info } = await convert(await download(url));
        const file = `${saved.length + 1}.webp`;
        await fs.writeFile(path.join(outDir, slug, file), data);
        saved.push({ src: `/products/${slug}/${file}`, width: info.width, height: info.height, source: url });
        console.log(`ok   ${slug} ${file} ${info.width}x${info.height}  ${url}`);
        done = true;
        break;
      } catch (e) {
        errors.push(`${url} (${e.message})`);
      }
    }
    if (!done) {
      failures.push(`${slug}: ${errors.join(' | ')}`);
      console.log(`FAIL ${slug}\n     ${errors.join('\n     ')}`);
    }
  }
  if (saved.length) manifest[slug] = { credit: entry.credit, images: saved };
  else { delete manifest[slug]; await fs.rm(path.join(outDir, slug), { recursive: true, force: true }); }
}

await fs.writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), models: manifest, failures }, null, 2) + '\n');
const total = Object.values(manifest).reduce((n, m) => n + m.images.length, 0);
console.log(`\n${Object.keys(manifest).length} models, ${total} photos, ${failures.length} slots failed`);
