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
  // A laptop photo is never tall and narrow; this catches a wrong image (e.g. a desktop tower).
  if (meta.height && meta.width / meta.height < 0.75) throw new Error(`portrait image ${meta.width}x${meta.height}, probably not a laptop`);
  return buf;
}

/**
 * Whitens small marks that sit apart from the laptop, such as the Intel badge in the corner
 * of Lenovo's photos. Works on 6 px cells: the largest connected shape is the laptop; any
 * shape under 5% of its size that lies wholly outside its outline is removed.
 */
async function removeStrayMarks(buf) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const C = 6, cw = Math.ceil(W / C), ch = Math.ceil(H / C);
  const on = new Uint8Array(cw * ch);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    if (Math.min(data[i], data[i + 1], data[i + 2]) < 225) on[((y / C) | 0) * cw + ((x / C) | 0)] = 1;
  }
  const label = new Int32Array(cw * ch).fill(-1);
  const comps = [];
  for (let s = 0; s < on.length; s++) {
    if (!on[s] || label[s] >= 0) continue;
    const c = { n: 0, x0: Infinity, y0: Infinity, x1: -1, y1: -1, cells: [] };
    const stack = [s];
    label[s] = comps.length;
    while (stack.length) {
      const k = stack.pop(), x = k % cw, y = (k / cw) | 0;
      c.n++; c.cells.push(k);
      c.x0 = Math.min(c.x0, x); c.y0 = Math.min(c.y0, y); c.x1 = Math.max(c.x1, x); c.y1 = Math.max(c.y1, y);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const nk = ny * cw + nx;
        if (on[nk] && label[nk] < 0) { label[nk] = comps.length; stack.push(nk); }
      }
    }
    comps.push(c);
  }
  if (comps.length < 2) return buf;
  const main = comps.reduce((a, b) => (b.n > a.n ? b : a));
  const pad = Math.round(Math.max(cw, ch) * 0.02);
  const stray = comps.filter((c) => c !== main && c.n < main.n * 0.05 &&
    (c.x1 < main.x0 - pad || c.x0 > main.x1 + pad || c.y1 < main.y0 - pad || c.y0 > main.y1 + pad));
  if (!stray.length) return buf;
  const out = Buffer.from(data);
  for (const c of stray) for (const k of c.cells) {
    const cx = (k % cw) * C, cy = ((k / cw) | 0) * C;
    for (let y = cy; y < Math.min(cy + C, H); y++) for (let x = cx; x < Math.min(cx + C, W); x++) {
      const i = (y * W + x) * 3; out[i] = out[i + 1] = out[i + 2] = 255;
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

async function convert(buf) {
  // Flatten first so transparent PNGs trim against white, then trim and pad evenly.
  const flat = await removeStrayMarks(await sharp(buf).flatten({ background: '#ffffff' }).png().toBuffer());
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
