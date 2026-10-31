'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Scroll scenes, ported from the GC Venture site (src/scripts/scenes.ts there).
 *
 * - [data-scene]: gets its scroll progress as the CSS variable --p (0 to 1).
 *   Pinned scenes (a tall element whose `.stage` child is position: sticky) run
 *   across the distance the stage stays pinned; any other scene runs from when its
 *   top reaches data-start (fraction of the window, default 0.9) until its bottom
 *   reaches data-end (default 0.4). Progress eases towards its target every frame,
 *   so motion stays smooth on coarse mouse wheels.
 * - data-scene="ticks": list items inside get the class "done" one by one.
 * - [data-reveal]: gets "is-in" once it enters the window (its [data-reveal-item]
 *   children follow in turn; lines of a [data-reveal="lines"] heading slide up).
 * - [data-count]: counts up from 0 the first time it is seen.
 * - [data-spot]: a light follows the pointer across it (--mx, --my).
 *
 * Everything is gated on <html class="scenes">, which is never added when the visitor
 * prefers reduced motion: without it every element shows its finished layout.
 */
type Scene = { el: HTMLElement; name: string; stage: HTMLElement | null; pinned: boolean; top: number; height: number; span: number; start: number; end: number; cur: number; shown: number };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function ticks(s: Scene, p: number) {
  const items = s.el.querySelectorAll<HTMLElement>('li[data-tick]');
  const n = Math.round(clamp(p * 1.25) * items.length);
  if (s.el.dataset.n === String(n)) return;
  s.el.dataset.n = String(n);
  items.forEach((li, i) => li.classList.toggle('done', i < n));
  const meter = s.el.querySelector('[data-tick-n]');
  if (meter) meter.textContent = String(n);
}

const handlers: Record<string, (s: Scene, p: number) => void> = { ticks };

function init(): () => void {
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.remove('scenes');
    return () => {};
  }
  root.classList.add('scenes');

  /* Reveals */
  const reveals = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)')];
  reveals.forEach((el) => {
    el.querySelectorAll<HTMLElement>('[data-reveal-item]').forEach((c, i) => c.style.setProperty('--i', String(i % 8)));
    el.querySelectorAll<HTMLElement>('.line').forEach((c, i) => c.style.setProperty('--l', String(i)));
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      el.classList.add('is-in');
      el.querySelectorAll('[data-reveal-item]').forEach((c) => c.classList.add('is-in'));
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });

  /* Numbers that count up the first time they come into view ([data-count]). */
  const counters = [...document.querySelectorAll<HTMLElement>('[data-count]')];
  const countIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      countIo.unobserve(el);
      const to = Number(el.dataset.count);
      if (!Number.isFinite(to)) continue;
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 1400);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  counters.forEach((el) => countIo.observe(el));

  /* A soft light that follows the pointer across glass panels ([data-spot]). */
  const onMove = (ev: PointerEvent) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-spot]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${ev.clientX - r.left}px`);
    el.style.setProperty('--my', `${ev.clientY - r.top}px`);
  };
  document.addEventListener('pointermove', onMove, { passive: true });
  reveals.forEach((el) => {
    // already on screen at load: show at once, with the entrance animation
    io.observe(el);
  });

  /* Progress scenes */
  const scenes: Scene[] = [...document.querySelectorAll<HTMLElement>('[data-scene]')].map((el) => ({
    el, name: el.dataset.scene ?? '', stage: el.querySelector<HTMLElement>(':scope > .stage'),
    pinned: false, top: 0, height: 0, span: 0,
    start: parseFloat(el.dataset.start ?? '0.9'), end: parseFloat(el.dataset.end ?? '0.4'), cur: -1, shown: -1,
  }));
  if (!scenes.length) return () => { io.disconnect(); countIo.disconnect(); document.removeEventListener('pointermove', onMove); };

  // clientHeight, not innerHeight: steadier on phones while the address bar moves
  const viewH = () => document.documentElement.clientHeight || innerHeight;
  let vh = viewH();
  let raf = 0;

  const measure = () => {
    vh = viewH();
    for (const s of scenes) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + scrollY;
      s.height = r.height;
      s.pinned = !!s.stage && getComputedStyle(s.stage).position === 'sticky' && r.height > vh * 1.2;
      s.span = s.pinned ? Math.max(1, s.height - s.stage!.offsetHeight) : 0;
    }
  };
  const target = (s: Scene, y: number) => {
    if (s.pinned) return clamp((y - s.top) / s.span);
    const top = s.top - y;
    const startY = vh * s.start;
    const endY = vh * s.end;
    return clamp((startY - top) / (startY - endY + s.height));
  };

  let lastFrame = 0;
  const frame = (now = performance.now()) => {
    raf = 0;
    let moving = false;
    // same feel at 60 and 120 frames a second: 20% of the gap per 60th of a second
    const dt = lastFrame ? Math.min(64, now - lastFrame) : 16.7;
    const ease = 1 - Math.pow(0.8, dt / 16.7);
    const y = scrollY;
    for (const s of scenes) {
      const t = target(s, y);
      if (s.cur < 0) s.cur = t;
      const d = t - s.cur;
      s.cur = Math.abs(d) < 0.0004 ? t : s.cur + d * ease;
      if (s.cur !== t) moving = true;
      if (Math.abs(s.cur - s.shown) > 0.0002 || s.shown < 0) {
        s.shown = s.cur;
        s.el.style.setProperty('--p', s.cur.toFixed(4));
        handlers[s.name]?.(s, s.cur);
      }
    }
    if (moving) { lastFrame = now; raf = requestAnimationFrame(frame); } else lastFrame = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  let resizeRaf = 0;
  const relayout = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const was = scenes.map((s) => s.pinned);
      measure();
      scenes.forEach((s, i) => { if (s.pinned !== was[i]) s.cur = -1; s.shown = -1; });
      kick();
    });
  };

  measure();
  frame();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  document.fonts?.ready.then(relayout);
  const ro = new ResizeObserver(relayout);
  ro.observe(document.body);

  return () => {
    io.disconnect();
    countIo.disconnect();
    document.removeEventListener('pointermove', onMove);
    ro.disconnect();
    removeEventListener('scroll', kick);
    removeEventListener('resize', relayout);
    removeEventListener('load', relayout);
    cancelAnimationFrame(raf);
    cancelAnimationFrame(resizeRaf);
  };
}

export default function Scenes() {
  const path = usePathname();
  useEffect(() => init(), [path]);
  return null;
}
