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
  // the -ext files carry ₹ and other currency signs missing from the Latin subset
  const [display, displayExt, text, textExt] = await Promise.all([read('bricolage-700.woff'), read('bricolage-700-ext.woff'), read('instrument-600.woff'), read('instrument-600-ext.woff')]);
  return [
    { name: 'Bricolage', data: display, style: 'normal' as const, weight: 700 as const },
    { name: 'Bricolage', data: displayExt, style: 'normal' as const, weight: 700 as const },
    { name: 'Instrument', data: text, style: 'normal' as const, weight: 600 as const },
    { name: 'Instrument', data: textExt, style: 'normal' as const, weight: 600 as const },
  ];
}

export const C = { bench: '#ecefea', spruce: '#0f3d33', ink: '#1e2b27', mute: '#56645f', tag: '#f5c84c', pass: '#16573a' };

/** The yellow tag, drawn with plain boxes. */
export function OgTag({ title, rows, width = 340 }: { title: string; rows: [string, string][]; width?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'rotate(4deg)' }}>
      <div style={{ width: 2, height: 46, background: 'rgba(15,61,51,.35)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', width, background: C.tag, borderRadius: 22, padding: '38px 26px 24px', position: 'relative', boxShadow: '0 30px 50px -20px rgba(15,61,51,.4)' }}>
        <div style={{ position: 'absolute', top: 14, left: width / 2 - 9, width: 18, height: 18, borderRadius: 9, background: C.bench }} />
        <div style={{ display: 'flex', justifyContent: 'center', fontFamily: 'Bricolage', fontSize: 28, color: C.spruce }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid rgba(15,61,51,.16)', padding: '10px 0', fontFamily: 'Instrument', fontSize: 21, color: C.spruce }}>
              <span>{k}</span><span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OgLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="30" height="38" viewBox="0 0 22 28"><path d="M5 0h12l5 4v20a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4z" fill={C.tag} /><circle cx="11" cy="5.5" r="2.2" fill={C.bench} /><path d="M6 16.5l3.3 3.3L16 13" fill="none" stroke={C.spruce} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span style={{ fontFamily: 'Bricolage', fontSize: 34, color: C.spruce, letterSpacing: -1 }}>{BRAND.name.toLowerCase()}</span>
    </div>
  );
}

/** ₹ drawn as strokes: neither share-image font includes the glyph. */
export function OgRupee({ size, color = C.spruce }: { size: number; color?: string }) {
  return (
    <svg width={size * 0.62} height={size} viewBox="0 0 20 32" style={{ marginRight: size * 0.06 }}>
      <path d="M3 5 H17 M3 11.5 H17 M3 5 H8 a6.25 6.25 0 0 1 0 12.5 H3 L14 29" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
