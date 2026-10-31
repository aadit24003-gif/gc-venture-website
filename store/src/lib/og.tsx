/**
 * Shared pieces for the generated share images (links on WhatsApp, X, LinkedIn…).
 * Rendered by next/og, which understands a subset of CSS: every element with more
 * than one child needs display: flex.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BRAND } from './config';

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = join(process.cwd(), 'src/lib/og-fonts');
  const read = (f: string) => readFile(join(dir, f));
  // the -ext files carry extra Latin letters and currency signs
  const [display, displayExt, text, textExt] = await Promise.all([read('funnel-display-700.woff'), read('funnel-display-700-ext.woff'), read('funnel-sans-500.woff'), read('funnel-sans-500-ext.woff')]);
  return [
    { name: 'Display', data: display, style: 'normal' as const, weight: 700 as const },
    { name: 'Display', data: displayExt, style: 'normal' as const, weight: 700 as const },
    { name: 'Text', data: text, style: 'normal' as const, weight: 500 as const },
    { name: 'Text', data: textExt, style: 'normal' as const, weight: 500 as const },
  ];
}

export const C = { canvas: '#f3f4f6', white: '#ffffff', ink: '#0e0f12', mute: '#5b606a', line: '#e3e5e9', accent: '#f5a524', accentInk: '#8a5200' };

/** The inspection report card, drawn with plain boxes. */
export function OgCert({ title, rows, width = 360, seal }: { title: string; rows: [string, string][]; width?: number; seal: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width, background: C.white, borderRadius: 22, border: `1.5px solid ${C.line}`, padding: '24px 26px', boxShadow: '0 30px 60px -24px rgba(14,15,18,.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontFamily: 'Text', fontSize: 17, color: C.mute, letterSpacing: 1.5 }}>{title.toUpperCase()}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 74, height: 74, borderRadius: 37, background: C.accent, border: `4px solid ${C.white}`, boxShadow: `0 0 0 2px ${C.ink}`, fontFamily: 'Display', fontSize: 17, color: C.ink }}>{seal}</div>
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

export function OgLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="36" height="36" viewBox="0 0 26 26"><circle cx="13" cy="13" r="13" fill={C.ink} /><circle cx="13" cy="13" r="8.6" fill={C.accent} /><path d="M9 13.2l2.7 2.7L17.2 10.4" fill="none" stroke={C.ink} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span style={{ display: 'flex', fontFamily: 'Display', fontSize: 34, color: C.ink, letterSpacing: -1.2 }}>{BRAND.name.toLowerCase()}<span style={{ color: C.accent }}>.</span></span>
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
