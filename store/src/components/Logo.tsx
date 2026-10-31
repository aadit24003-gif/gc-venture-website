import { BRAND } from '@/lib/config';

/**
 * The LappyClub emblem: a Bodoni "L" drawn as an open laptop (the thick stem is the
 * lid, the hairline base the keyboard deck), held inside the open "C" of the club, with
 * a gold clasp in the opening. Shared with the share images and the favicon.
 */
export const EMBLEM = {
  viewBox: '0 0 40 40',
  ring: 'M34.92 9.94A18 18 0 1 0 34.92 30.06',
  /** stem (lid), its hairline top serif, the base (deck) and the base's upturned serif */
  letter: ['M13.4 12.4h3l1.4 15h-3z', 'M11.6 11.7h6.6v.75h-6.6z', 'M14.8 27.1h16.4v1.35H14.8z', 'M30.3 24.3h.9v4.15h-.9z'],
  clasp: { cx: 36.9, cy: 20, r: 1.25 },
};

export const LOGO_COLORS = { ink: '#16130f', ivory: '#faf8f3', gold: '#b8935a' };

export function Emblem({ size = 30, tone = 'dark', className = '' }: { size?: number; tone?: 'dark' | 'light'; className?: string }) {
  const letter = tone === 'dark' ? LOGO_COLORS.ink : LOGO_COLORS.ivory;
  return (
    <svg width={size} height={size} viewBox={EMBLEM.viewBox} aria-hidden="true" className={className}>
      <path d={EMBLEM.ring} fill="none" stroke={LOGO_COLORS.gold} strokeWidth="1.5" strokeLinecap="round" />
      {EMBLEM.letter.map((d) => <path key={d} d={d} fill={letter} />)}
      <circle {...EMBLEM.clasp} fill={LOGO_COLORS.gold} />
    </svg>
  );
}

/** Emblem plus the tracked serif wordmark. The name comes from config (BRAND.name). */
export default function Logo({ className = '', tone = 'dark', compact = false }: { className?: string; tone?: 'dark' | 'light'; compact?: boolean }) {
  const ink = tone === 'dark' ? LOGO_COLORS.ink : LOGO_COLORS.ivory;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Emblem size={compact ? 28 : 32} tone={tone} />
      <span className="display text-[15px] font-medium uppercase leading-none tracking-[0.2em] sm:text-[18px] sm:tracking-[0.24em]" style={{ color: ink }}>
        {BRAND.name}
      </span>
    </span>
  );
}
