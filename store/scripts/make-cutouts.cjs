/**
 * Makes background-free versions of a few product photos for the dark home-page sections.
 * The manufacturers' photos sit on white; this removes the white that touches the edges
 * (flood fill, so white parts inside the laptop stay) and softens the outline.
 *
 *   node scripts/make-cutouts.cjs lenovo-thinkpad-x1-carbon-gen-9:1:200 apple-macbook-air-m3:1
 *
 * The optional third part is how white a pixel must be to count as background (default 236);
 * lower it for dark laptops whose photos have a grey floor shadow.
 *
 * Writes public/products/<slug>/cutout.webp.
 */
const sharp = require('sharp');
const path = require('node:path');

async function cutout(slug, n, min = 236) {
  const src = path.join(__dirname, '..', 'public', 'products', slug, `${n}.webp`);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const whiteness = (i) => { const [r, g, b] = px(i); return Math.min(r, g, b) - (Math.max(r, g, b) - Math.min(r, g, b)); };
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (i) => { if (!bg[i] && whiteness(i) >= min) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w); if (y < h - 1) push(i + w);
  }
  // Alpha: background removed; pixels next to it fade by how white they are (anti-aliased edge).
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) { data[i * 4 + 3] = 0; continue; }
    const x = i % w, y = (i / w) | 0;
    const edge = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
    if (edge) {
      const t = Math.max(0, Math.min(1, (whiteness(i) - 170) / 70));
      data[i * 4 + 3] = Math.round(255 * (1 - t * 0.85));
    }
  }
  const out = path.join(__dirname, '..', 'public', 'products', slug, 'cutout.webp');
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 0 }).webp({ quality: 88, alphaQuality: 90 }).toFile(out);
  console.log('wrote', path.relative(process.cwd(), out));
}

(async () => {
  for (const arg of process.argv.slice(2)) {
    const [slug, n = '1', min] = arg.split(':');
    await cutout(slug, n, min ? Number(min) : undefined);
  }
})();
