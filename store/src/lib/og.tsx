/**
 * Shared pieces for the generated share images (links on WhatsApp, X, LinkedIn…).
 * Rendered by next/og, which understands a subset of CSS: every element with more
 * than one child needs display: flex.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BRAND } from './config';
import { EMBLEM } from '@/components/Logo';

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = join(process.cwd(), 'src/lib/og-fonts');
  const read = (f: string) => readFile(join(dir, f));
  // the -ext files carry extra Latin letters and currency signs
  const [display, bold, text, textExt] = await Promise.all([read('inter-800.woff'), read('inter-700.woff'), read('inter-500.woff'), read('inter-500-ext.woff')]);
  return [
    { name: 'Display', data: display, style: 'normal' as const, weight: 800 as const },
    { name: 'Bold', data: bold, style: 'normal' as const, weight: 700 as const },
    { name: 'Text', data: text, style: 'normal' as const, weight: 500 as const },
    { name: 'Text', data: textExt, style: 'normal' as const, weight: 500 as const },
  ];}

export const C = { canvas: '#f5f5f7', ivory: '#ffffff', white: '#ffffff', ink: '#111111', mute: '#6e6e73', line: '#e5e5ea', accent: '#ff5a1f', accentInk: '#c2410c', gold: '#ffffff', deal: '#ff5a1f' };

/** The inspection report card, drawn with plain boxes. */
export function OgCert({ title, rows, width = 360, seal }: { title: string; rows: [string, string][]; width?: number; seal: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width, background: C.white, borderRadius: 20, border: `1.5px solid ${C.line}`, padding: '24px 26px', boxShadow: '0 30px 60px -24px rgba(22,19,15,.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontFamily: 'Bold', fontSize: 18, color: C.mute, letterSpacing: 1 }}>{title.toUpperCase()}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 76, height: 76, borderRadius: 38, background: C.ink, border: `4px solid ${C.white}`, boxShadow: `0 0 0 2px ${C.ink}`, fontFamily: 'Bold', fontSize: 17, color: C.white }}>{seal}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1.5px dashed ${C.line}`, padding: '11px 0', fontFamily: 'Text', fontSize: 21, color: C.ink }}>
            <span style={{ color: C.mute }}>{k}</span><span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OgLogo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const name = BRAND.name.toLowerCase();
  const [head, tail] = name.endsWith('club') ? [name.slice(0, -4), 'club'] : [name, ''];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width="52" height="52" viewBox={EMBLEM.viewBox}>
        <rect width="40" height="40" rx={EMBLEM.tileRadius} fill={tone === 'dark' ? C.ink : C.white} />
        <path d={EMBLEM.stroke} fill="none" stroke={tone === 'dark' ? C.white : C.ink} strokeWidth={EMBLEM.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={EMBLEM.dot.cx} cy={EMBLEM.dot.cy} r={EMBLEM.dot.r} fill={C.accent} />
      </svg>
      <span style={{ display: 'flex', fontFamily: 'Display', fontSize: 38, color: tone === 'dark' ? C.ink : C.white, letterSpacing: -1.8 }}>{head}<span style={{ color: C.accent }}>{tail}</span></span>
    </div>
  );
}

/** ₹ drawn as strokes, so it renders the same whatever the font. */
export function OgRupee({ size, color = C.ink }: { size: number; color?: string }) {
  return (
    <svg width={size * 0.62} height={size} viewBox="0 0 20 32" style={{ marginRight: size * 0.06 }}>
      <path d="M3 5 H17 M3 11.5 H17 M3 5 H8 a6.25 6.25 0 0 1 0 12.5 H3 L14 29" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A product photo from /public as a PNG data URI (the renderer doesn't read WebP). */
export async function ogPhoto(src: string, w = 560, h = 400): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;
    const buf = await sharp(join(process.cwd(), 'public', src.replace(/^\//, ''))).resize(w, h, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}
