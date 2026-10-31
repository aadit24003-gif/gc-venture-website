'use client';

import { useEffect, useRef, useState } from 'react';

/** Counts smoothly from the previous value to the new one (e.g. a price after choosing an upgrade). */
export default function AnimatedNumber({ value, format, duration = 450 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    if (a === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, duration]);
  return <>{format(shown)}</>;
}
