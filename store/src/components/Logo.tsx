import { BRAND } from '@/lib/config';

/** Wordmark with the inspection seal as its symbol. The name comes from config (BRAND.name). */
export default function Logo({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const ink = tone === 'dark' ? '#0e0f12' : '#ffffff';
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r="13" fill={ink} />
        <circle cx="13" cy="13" r="8.6" fill="#f5a524" />
        <path d="M9 13.2l2.7 2.7L17.2 10.4" fill="none" stroke="#0e0f12" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="display text-[22px] font-[750] leading-none tracking-[-0.04em]" style={{ color: ink }}>
        {BRAND.name.toLowerCase()}<span style={{ color: '#f5a524' }}>.</span>
      </span>
    </span>
  );
}
