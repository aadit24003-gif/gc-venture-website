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
  const [display, displayItalic, text, textExt] = await Promise.all([read('bodoni-500.woff'), read('bodoni-500-italic.woff'), read('jost-500.woff'), read('jost-500-ext.woff')]);
  return [
    { name: 'Display', data: display, style: 'normal' as const, weight: 500 as const },
    { name: 'Display', data: displayItalic, style: 'italic' as const, weight: 500 as const },
    { name: 'Text', data: text, style: 'normal' as const, weight: 500 as const },
    { name: 'Text', data: textExt, style: 'normal' as const, weight: 500 as const },
  ];
}

export const C = { canvas: '#f4f0e8', ivory: '#faf8f3', white: '#ffffff', ink: '#16130f', mute: '#6f685e', line: '#e8e2d6', accent: '#b8935a', accentInk: '#77592b', gold: '#dcc49a' };

/** The inspection report card, drawn with plain boxes. */
export function OgCert({ title, rows, width = 360, seal }: { title: string; rows: [string, string][]; width?: number; seal: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width, background: C.white, borderRadius: 8, border: `1.5px solid ${C.line}`, padding: '24px 26px', boxShadow: '0 30px 60px -24px rgba(22,19,15,.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 15, color: C.accentInk, letterSpacing: 3.5 }}>{title.toUpperCase()}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 76, height: 76, borderRadius: 38, background: C.ink, border: `3px solid ${C.ink}`, boxShadow: `inset 0 0 0 1.5px ${C.accent}`, fontFamily: 'Text', fontSize: 16, color: C.gold }}>{seal}</div>
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
  const ink = tone === 'dark' ? C.ink : C.ivory;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width="48" height="48" viewBox={EMBLEM.viewBox}>
        <path d={EMBLEM.ring} fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" />
        {EMBLEM.letter.map((d) => <path key={d} d={d} fill={ink} />)}
        <circle cx={EMBLEM.clasp.cx} cy={EMBLEM.clasp.cy} r={EMBLEM.clasp.r} fill={C.accent} />
      </svg>
      <span style={{ display: 'flex', fontFamily: 'Display', fontSize: 30, color: ink, letterSpacing: 7 }}>{BRAND.name.toUpperCase()}</span>
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
