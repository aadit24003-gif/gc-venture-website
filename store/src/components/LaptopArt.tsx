/**
 * A drawn, front-on laptop used wherever a product has no photo yet, so the
 * catalogue looks consistent. Body colour, screen, notch and brand details follow
 * the product's `art` spec. The wallpaper is one of three scenes picked from the slug.
 */
import type { ArtSpec } from '@/lib/db/schema';
import { BRAND_MARKS } from '@/lib/brand-marks';

const BODY: Record<ArtSpec['colour'], { frame: string; deck: string; deckFront: string; keys: string; pad: string }> = {
  black: { frame: '#1c1f21', deck: '#2a2e31', deckFront: '#202326', keys: '#111314', pad: '#24282b' },
  graphite: { frame: '#3b4045', deck: '#4d5358', deckFront: '#40454a', keys: '#1d2023', pad: '#454b50' },
  silver: { frame: '#c3c8cc', deck: '#d9dde0', deckFront: '#c9ced2', keys: '#2b2e31', pad: '#cfd4d8' },
  'space-grey': { frame: '#7a7e83', deck: '#8f9398', deckFront: '#7f8388', keys: '#1d1e20', pad: '#868a8f' },
  midnight: { frame: '#2c3440', deck: '#353f4c', deckFront: '#2c3540', keys: '#14181d', pad: '#313a46' },
  starlight: { frame: '#d8d0c1', deck: '#e8e1d4', deckFront: '#dbd3c5', keys: '#2a2a2a', pad: '#e0d8ca' },
};

const SCENES = [
  { sky: ['#bfd8cb', '#f1ebd2'], sun: '#f5c84c', hills: ['#4a8670', '#2a6553', '#0f3d33'], stars: false },
  { sky: ['#1f5245', '#e3b23c'], sun: '#fbdc78', hills: ['#1d4c40', '#133a31', '#0a2a23'], stars: false },
  { sky: ['#0b2f27', '#1f5446'], sun: '#f5c84c', hills: ['#0d3229', '#09261f', '#061b16'], stars: true },
] as const;

function seed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Keyboard keys drawn in perspective inside the keyboard well. */
function keys(colour: string) {
  const rows = 5;
  const cols = 14;
  const out: string[] = [];
  const top = { y: 243, l: 112, r: 368 };
  const bot = { y: 271, l: 90, r: 390 };
  for (let r = 0; r < rows; r++) {
    const t0 = r / rows + 0.02;
    const t1 = (r + 1) / rows - 0.03;
    const y0 = lerp(top.y, bot.y, t0);
    const y1 = lerp(top.y, bot.y, t1);
    const l0 = lerp(top.l, bot.l, t0), r0 = lerp(top.r, bot.r, t0);
    const l1 = lerp(top.l, bot.l, t1), r1 = lerp(top.r, bot.r, t1);
    // the bottom row has a space bar in the middle
    const cells: [number, number][] = r === rows - 1
      ? [[0, 1], [1, 2], [2, 3], [3, 4], [4, 10], [10, 11], [11, 12], [12, 13], [13, 14]]
      : Array.from({ length: cols }, (_, c) => [c, c + 1] as [number, number]);
    for (const [a, b] of cells) {
      const ga = a / cols + 0.006, gb = b / cols - 0.006;
      const pts = [
        [lerp(l0, r0, ga), y0], [lerp(l0, r0, gb), y0], [lerp(l1, r1, gb), y1], [lerp(l1, r1, ga), y1],
      ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      out.push(pts);
    }
  }
  return out.map((p, i) => <polygon key={i} points={p} fill={colour} />);
}

type Props = {
  art: ArtSpec;
  brand: string;
  slug: string;
  className?: string;
  /** Hide the drop shadow (e.g. when the art sits on a dark band). */
  flat?: boolean;
  title?: string;
  /** Leave out SVG text (for the share-image renderer, which can't draw it). */
  noText?: boolean;
};

export default function LaptopArt({ art, brand, slug, className, flat, title, noText }: Props) {
  const b = BODY[art.colour];
  const h = seed(slug);
  const scene = SCENES[h % SCENES.length];
  const id = `la-${slug}`;
  const isMac = art.style.startsWith('macbook');
  const screen = isMac ? { x: 80, y: 18, w: 320, h: 202 } : { x: 88, y: 24, w: 304, h: 180 };
  const sunX = screen.x + screen.w * (0.25 + ((h >> 3) % 50) / 100);
  const sunY = screen.y + screen.h * 0.48;
  const mark = brand === 'Dell' ? BRAND_MARKS.dell : brand === 'HP' ? BRAND_MARKS.hp : null;
  const hillsY = screen.y + screen.h;

  return (
    <svg viewBox="0 0 480 330" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={scene.sky[0]} />
          <stop offset="1" stopColor={scene.sky[1]} />
        </linearGradient>
        <linearGradient id={`${id}-deck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={b.deck} />
          <stop offset="1" stopColor={b.deckFront} />
        </linearGradient>
        <linearGradient id={`${id}-glare`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-screen`}>
          <rect x={screen.x} y={screen.y} width={screen.w} height={screen.h} rx={isMac ? 6 : 3} />
        </clipPath>
        {!flat && (
          <filter id={`${id}-blur`} x="-10%" y="-200%" width="120%" height="500%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        )}
      </defs>

      {!flat && <ellipse cx="240" cy="312" rx="222" ry="9" fill="#0f3d33" opacity=".22" filter={`url(#${id}-blur)`} />}

      {/* lid */}
      <rect x="66" y="6" width="348" height="228" rx="15" fill={b.frame} />
      <rect x="72" y="12" width="336" height="216" rx="11" fill="#0a0c0d" />
      <g clipPath={`url(#${id}-screen)`}>
        <rect x={screen.x} y={screen.y} width={screen.w} height={screen.h} fill={`url(#${id}-sky)`} />
        {scene.stars && Array.from({ length: 14 }, (_, i) => (
          <circle key={i} cx={screen.x + ((h >> i) % 290) + 8} cy={screen.y + ((h >> (i + 3)) % 70) + 8} r={i % 3 ? 0.8 : 1.3} fill="#f3efd9" opacity=".7" />
        ))}
        <circle cx={sunX} cy={sunY} r={scene.stars ? 13 : 30} fill={scene.sun} />
        <path d={`M${screen.x} ${hillsY - 70} C ${screen.x + 70} ${hillsY - 100}, ${screen.x + 150} ${hillsY - 52}, ${screen.x + 220} ${hillsY - 78} S ${screen.x + 300} ${hillsY - 92}, ${screen.x + screen.w} ${hillsY - 66} V ${hillsY} H ${screen.x} Z`} fill={scene.hills[0]} />
        <path d={`M${screen.x} ${hillsY - 40} C ${screen.x + 90} ${hillsY - 72}, ${screen.x + 170} ${hillsY - 22}, ${screen.x + 250} ${hillsY - 48} S ${screen.x + 290} ${hillsY - 58}, ${screen.x + screen.w} ${hillsY - 34} V ${hillsY} H ${screen.x} Z`} fill={scene.hills[1]} />
        <path d={`M${screen.x} ${hillsY - 14} C ${screen.x + 60} ${hillsY - 30}, ${screen.x + 140} ${hillsY - 4}, ${screen.x + 200} ${hillsY - 18} S ${screen.x + 280} ${hillsY - 30}, ${screen.x + screen.w} ${hillsY - 10} V ${hillsY} H ${screen.x} Z`} fill={scene.hills[2]} />
        <rect x={screen.x} y={screen.y} width={screen.w} height={screen.h} fill={`url(#${id}-glare)`} />
      </g>
      {art.notch && <rect x="224" y="12" width="32" height="10" rx="4" fill="#0a0c0d" />}
      <circle cx="240" cy={isMac ? 16 : 18} r="2" fill="#2a3134" />

      {/* chin branding */}
      {mark && (
        <svg x="232" y="208" width="16" height="16" viewBox="0 0 24 24">
          <path d={mark} fill="#8a9196" />
        </svg>
      )}
      {art.style === 'thinkpad' && !noText && (
        <text x="92" y="219" fontSize="8.5" fontFamily="Arial, sans-serif" fill="#7d8489" letterSpacing=".4">Lenovo</text>
      )}

      {/* hinge and deck */}
      <rect x="86" y="230" width="308" height="7" rx="3" fill={b.deckFront} />
      <path d="M58 235 H422 Q428 235 431 240 L468 296 Q470 302 462 302 H18 Q10 302 12 296 L49 240 Q52 235 58 235 Z" fill={`url(#${id}-deck)`} />
      <path d="M106 240 H374 L396 274 H84 Z" fill={b.keys} opacity=".55" />
      {keys(b.keys)}
      {art.style === 'thinkpad' && <circle cx="240" cy="262.5" r="2.6" fill="#e1251b" />}
      <path d={isMac ? 'M188 278 H292 L297 297 H183 Z' : 'M205 278 H275 L279 296 H201 Z'} fill={b.pad} stroke="rgba(0,0,0,.08)" />
      <rect x="10" y="300" width="460" height="7" rx="3.5" fill={b.deckFront} />
      <rect x="208" y="300" width="64" height="3" rx="1.5" fill="rgba(0,0,0,.18)" />
    </svg>
  );
}
