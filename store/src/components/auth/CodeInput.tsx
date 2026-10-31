'use client';

import { useEffect, useRef } from 'react';

/** Six single-digit boxes that behave like one field: typing advances, backspace goes back, paste fills all. */
export default function CodeInput({ value, onChange, onComplete, disabled, invalid }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean; invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const set = (next: string) => {
    const v = next.replace(/\D/g, '').slice(0, 6);
    onChange(v);
    if (v.length === 6) onComplete?.(v);
    refs.current[Math.min(v.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 sm:gap-3" role="group" aria-label="6-digit code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          maxLength={6}
          className={`num h-14 w-full min-w-0 rounded-2xl border-[1.5px] bg-white text-center text-[24px] font-semibold text-spruce transition-colors focus:border-spruce focus:outline-none focus:ring-4 focus:ring-spruce/10 sm:h-16 ${invalid ? 'border-alert' : d ? 'border-spruce/60' : 'border-line'}`}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '');
            if (typed.length > 1) { set(typed); return; } // paste or SMS autofill
            const arr = digits.slice();
            arr[i] = typed;
            const joined = arr.join('').slice(0, 6);
            onChange(joined);
            if (typed && i < 5) refs.current[i + 1]?.focus();
            if (joined.length === 6 && !arr.includes('')) onComplete?.(joined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => { e.preventDefault(); set(e.clipboardData.getData('text')); }}
        />
      ))}
    </div>
  );
}
