import { BRAND } from '@/lib/config';

/**
 * The LappyClub mark: a blue tile with a bold "L" drawn as an open laptop seen from the side
 * (the leaning stroke is the screen, the flat stroke the keyboard deck) and a dot for the camera.
 * Shared with the share images and the favicon (src/app/icon.svg).
 */
export const EMBLEM = {
  viewBox: '0 0 40 40',
  tileRadius: 11,
  stroke: 'M14.2 10.8 L16.2 27.6 H28.6',
  strokeWidth: 4.4,
  dot: { cx: 28.4, cy: 13.4, r: 2.7 },
};

export const LOGO_COLORS = { ink: '#0d1321', white: '#ffffff', blue: '#2563eb' };

export function Emblem({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox={EMBLEM.viewBox} aria-hidden="true" className={className}>
      <rect width="40" height="40" rx={EMBLEM.tileRadius} fill={LOGO_COLORS.blue} />
      <path d={EMBLEM.stroke} fill="none" stroke={LOGO_COLORS.white} strokeWidth={EMBLEM.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle {...EMBLEM.dot} fill={LOGO_COLORS.white} />
    </svg>
  );
}

/** Mark plus the wordmark: "lappy" in ink, "club" in blue. The name comes from config (BRAND.name). */
export default function Logo({ className = '', tone = 'dark', compact = false }: { className?: string; tone?: 'dark' | 'light'; compact?: boolean }) {
  const name = BRAND.name.toLowerCase();
  const split = name.endsWith('club') ? [name.slice(0, -4), 'club'] : [name, ''];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Emblem size={compact ? 30 : 34} />
      <span className={`font-[800] leading-none tracking-[-0.04em] ${compact ? 'text-[21px]' : 'text-[23px]'}`} style={{ color: tone === 'dark' ? LOGO_COLORS.ink : LOGO_COLORS.white }}>
        {split[0]}<span style={{ color: tone === 'dark' ? LOGO_COLORS.blue : '#9dbbff' }}>{split[1]}</span>
      </span>
    </span>
  );
}
