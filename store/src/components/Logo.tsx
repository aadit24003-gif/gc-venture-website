import { BRAND } from '@/lib/config';

/** Wordmark with the condition tag as its symbol. The name comes from config (BRAND.name). */
export default function Logo({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const ink = tone === 'dark' ? '#0f3d33' : '#ffffff';
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true">
        <path d="M5 0h12l5 4v20a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4z" fill="#f5c84c" />
        <circle cx="11" cy="5.5" r="2.2" fill={tone === 'dark' ? '#ecefea' : '#0f3d33'} />
        <path d="M6 16.5l3.3 3.3L16 13" fill="none" stroke="#0f3d33" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="display text-[23px] font-[750] leading-none tracking-[-0.03em]" style={{ color: ink, fontVariationSettings: "'opsz' 32" }}>
        {BRAND.name.toLowerCase()}
      </span>
    </span>
  );
}
