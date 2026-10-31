/**
 * Removes the white studio background from a laptop photo, for the dark home-page tiles.
 * Flood-fills from the edges (so white parts inside the laptop stay) and softens the outline.
 * Same method as scripts/make-cutouts.cjs, used live by /media/cutout/<model>.
 */
import sharp from 'sharp';

export async function cutoutWebp(input: Buffer, min = 236): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const white = (i: number) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    return Math.min(r, g, b) - (Math.max(r, g, b) - Math.min(r, g, b));
  };
  const bg = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (i: number) => { if (!bg[i] && white(i) >= min) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) { data[i * 4 + 3] = 0; continue; }
    const x = i % w, y = (i / w) | 0;
    const edge = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
    if (edge) data[i * 4 + 3] = Math.round(255 * (1 - Math.max(0, Math.min(1, (white(i) - 170) / 70)) * 0.85));
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 0 }).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
}
