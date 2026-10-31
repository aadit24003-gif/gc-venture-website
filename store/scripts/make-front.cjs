/**
 * Front-view laptop images for the home-page tiles, all in the same pose as the Dell
 * Latitude photo: just the screen, standing upright, on a thin base edge seen from the
 * front (no keyboard). Crops the lid from a front-facing manufacturer photo, removes its
 * white background and draws the base. Writes public/products/<slug>/front.webp.
 *
 *   node scripts/make-front.cjs            (all in the list below)
 *
 * lid: the lid's box in the source photo (left, top, right, bottom, in pixels).
 * base: 'silver' | 'dark' draws a base; { top, bottom, left, right } instead cuts the
 * photo's own base strip (used for the MacBook, whose photo is already a front view).
 */
const sharp = require('sharp');
const path = require('node:path');

const LIST = [
  { slug: 'hp-elitebook-840-g10', n: 1, lid: [120, 33, 1098, 696], base: 'silver' },
  { slug: 'lenovo-thinkpad-e14-gen-4', n: 1, lid: [106, 32, 793, 474], base: 'dark' },
  { slug: 'apple-macbook-air-m3', n: 1, lid: [104, 30, 856, 549], base: { left: 28, top: 546, right: 932, bottom: 580 } },
];

/** Makes white touching the edges transparent (flood fill) and softens the outline. */
function clearWhite(data, w, h, min = 236) {
  const white = (i) => { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; return Math.min(r, g, b) - (Math.max(r, g, b) - Math.min(r, g, b)); };
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (i) => { if (!bg[i] && white(i) >= min) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop(); const x = i % w; const y = (i / w) | 0;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w);
  }
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) { data[i * 4 + 3] = 0; continue; }
    const x = i % w; const y = (i / w) | 0;
    const edge = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
    if (edge) data[i * 4 + 3] = Math.round(255 * (1 - Math.max(0, Math.min(1, (white(i) - 170) / 70)) * 0.85));
  }
}

async function cutRegion(src, [l, t, r, b]) {
  const { data, info } = await sharp(src).extract({ left: l, top: t, width: r - l, height: b - t }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  clearWhite(data, info.width, info.height);
  return { buf: await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(), w: info.width, h: info.height };
}

function baseSvg(lidW, tone) {
  const W = Math.round(lidW * 1.1);
  const H = Math.max(14, Math.round(lidW * 0.032));
  const c = tone === 'silver' ? ['#eef0f2', '#c9ccd1', '#9a9da3', '#7c7f85'] : ['#4a4b50', '#26272b', '#141518', '#0b0b0d'];
  const lipW = Math.round(lidW * 0.2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 4}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".35" stop-color="${c[1]}"/><stop offset=".8" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs>
    <path d="M0 0 H${W} V${H * 0.55} Q${W} ${H} ${W - H * 0.9} ${H} H${H * 0.9} Q0 ${H} 0 ${H * 0.55} Z" fill="url(#g)"/>
    <rect x="${(W - lipW) / 2}" y="0" width="${lipW}" height="${H * 0.42}" rx="${H * 0.2}" fill="url(#l)"/>
    <rect x="${W * 0.08}" y="${H}" width="${W * 0.1}" height="3" rx="1.5" fill="${c[3]}" opacity=".8"/>
    <rect x="${W * 0.82}" y="${H}" width="${W * 0.1}" height="3" rx="1.5" fill="${c[3]}" opacity=".8"/>
  </svg>`;
  return { buf: Buffer.from(svg), w: W, h: H + 4 };
}

(async () => {
  for (const it of LIST) {
    const dir = path.join(__dirname, '..', 'public', 'products', it.slug);
    const src = path.join(dir, `${it.n}.webp`);
    const lid = await cutRegion(src, it.lid);
    const base = typeof it.base === 'string' ? baseSvg(lid.w, it.base) : await cutRegion(src, [it.base.left, it.base.top, it.base.right, it.base.bottom]);
    const W = Math.max(lid.w, base.w);
    const lidLeft = typeof it.base === 'string' ? Math.round((W - lid.w) / 2) : it.lid[0] - it.base.left;
    const H = lid.h + base.h - 2;
    const out = path.join(dir, 'front.webp');
    await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: base.buf, left: Math.round((W - base.w) / 2), top: lid.h - 2 }, { input: lid.buf, left: lidLeft, top: 0 }])
      .webp({ quality: 90, alphaQuality: 95 }).toFile(out);
    console.log('wrote', path.relative(process.cwd(), out), `${W}x${H}`);
  }
})();
