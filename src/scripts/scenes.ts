/**
 * Scroll scenes for the home page.
 *
 * Every [data-scene] element gets its scroll progress as the CSS variable --p
 * (0 to 1). Two kinds:
 *  - pinned: the element is tall and its .stage child is position: sticky.
 *    Progress runs across the distance the stage stays pinned.
 *  - flow: anything else. Progress runs from when the element's top reaches
 *    data-start (fraction of the viewport, default 0.9) until its bottom
 *    reaches data-end (default 0.4).
 * Progress is eased towards its target each frame, so motion stays smooth on
 * coarse mouse wheels. Scenes are only active when <html> has the "scenes"
 * class (added in Base.astro unless the visitor prefers reduced motion);
 * without it every scene shows its finished, static layout.
 */

type Scene = {
  el: HTMLElement;
  name: string;
  stage: HTMLElement | null;
  pinned: boolean;
  top: number;
  height: number;
  /** Scroll distance over which a pinned scene runs (its height less the pinned stage's). */
  span: number;
  start: number;
  end: number;
  cur: number;
  shown: number;
};

declare global {
  interface Window { __scenes?: { destroy: () => void } }
}

const root = document.documentElement;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* How renting works: which cards have landed, for the step dots. */
function steps(s: Scene, p: number) {
  const landed = [0, 1, 2, 3].filter((i) => p >= 0.04 + i * 0.21 + 0.12).length;
  if (s.el.dataset.step !== String(landed)) s.el.dataset.step = String(landed);
}

/* Preparation: quality checks tick one by one. */
function qa(s: Scene, p: number) {
  const items = s.el.querySelectorAll<HTMLElement>('li');
  const n = Math.round(p * items.length);
  if (s.el.dataset.n === String(n)) return;
  s.el.dataset.n = String(n);
  items.forEach((li, i) => li.classList.toggle('done', i < n));
  const prep = s.el.closest<HTMLElement>('.prep');
  prep?.style.setProperty('--qa', (n / items.length).toFixed(3));
  const meter = prep?.querySelector('[data-qa-n]');
  if (meter) meter.textContent = String(n);
}

/* Preparation: the delivery route draws and each stop lights up as the parcel passes it. */
function route(s: Scene, p: number) {
  const items = s.el.querySelectorAll<HTMLElement>(':scope > li:not(.route-run)');
  const last = items.length - 1;
  items.forEach((li, i) => li.classList.toggle('reached', p > 0.02 && p >= i / last - 0.02));
}

const handlers: Record<string, (s: Scene, p: number) => void> = { steps, qa, route };

function init() {
  window.__scenes?.destroy();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.remove('scenes');
    return;
  }
  root.classList.add('scenes');

  const scenes: Scene[] = [...document.querySelectorAll<HTMLElement>('[data-scene]')].map((el) => ({
    el,
    name: el.dataset.scene ?? '',
    stage: el.querySelector<HTMLElement>(':scope > .stage'),
    pinned: false,
    top: 0,
    height: 0,
    span: 0,
    start: parseFloat(el.dataset.start ?? '0.9'),
    end: parseFloat(el.dataset.end ?? '0.4'),
    cur: -1,
    shown: -1,
  }));
  if (!scenes.length) return;

  // clientHeight, not innerHeight: on phones a page that is accidentally wider than the
  // screen makes the browser zoom out and innerHeight grow, which would unpin every scene.
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
      // The pinned stage is 100svh: measuring it (not innerHeight) keeps progress steady
      // while a phone's address bar slides in and out.
      s.span = s.pinned ? Math.max(1, s.height - s.stage!.offsetHeight) : 0;
    }
  };

  const target = (s: Scene, y = scrollY) => {
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
    // Same feel at 60 and 120 frames a second: 20% of the gap per 60th of a second.
    const dt = lastFrame ? Math.min(64, now - lastFrame) : 16.7;
    const ease = 1 - Math.pow(0.8, dt / 16.7);
    // read the scroll position once, before this frame writes any styles
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
      const wasPinned = scenes.map((s) => s.pinned);
      measure();
      // a scene that switches between pinned and static jumps to where it should be
      scenes.forEach((s, i) => { if (s.pinned !== wasPinned[i]) s.cur = -1; s.shown = -1; });
      // An on-screen keyboard that shrinks the window can switch a scene to its static
      // layout while the visitor types in it: keep what they are typing in view.
      const a = document.activeElement as HTMLElement | null;
      if (a && a.matches('input, textarea') && scenes.some((s, i) => wasPinned[i] && !s.pinned && s.el.contains(a))) {
        a.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      }
      kick();
    });
  };

  // Keyboard users: tabbing into a part of a pinned scene that is not on
  // screen yet scrolls to where that part is visible.
  const onFocus = (e: FocusEvent) => {
    const t = e.target as HTMLElement;
    for (const s of scenes) {
      if (!s.pinned || !s.el.contains(t)) continue;
      const anchor = t.closest<HTMLElement>('[data-at]');
      if (!anchor) continue;
      const at = parseFloat(anchor.dataset.at!);
      if (Number.isNaN(at)) continue;
      const want = s.top + at * s.span;
      if (Math.abs(scrollY - want) > 4) {
        window.scrollTo({ top: want, behavior: 'instant' as ScrollBehavior });
        s.cur = at;
        kick();
      }
    }
  };

  measure();
  frame();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  document.fonts?.ready.then(relayout);
  const ro = new ResizeObserver(relayout);
  ro.observe(document.body);
  document.addEventListener('focusin', onFocus);

  // Background video: load when near, play while visible, respect the pause button.
  const videos = [...document.querySelectorAll<HTMLVideoElement>('video[data-src-lg]')];
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) {
        if (!v.src && !saveData) v.src = videoSource(v);
        if (v.src && v.dataset.userPaused !== 'true') v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    }
  }, { rootMargin: '25% 0px' });
  videos.forEach((v) => io.observe(v));

  window.__scenes = {
    destroy() {
      removeEventListener('scroll', kick);
      removeEventListener('resize', relayout);
      removeEventListener('load', relayout);
      document.removeEventListener('focusin', onFocus);
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    },
  };
}

/**
 * WebM (VP9) where supported, MP4 (H.264) otherwise. The size is the smallest
 * that covers the screen's pixels: 2560 on large high-density screens, 1920 on
 * other desktops and on high-density phones, 1280 otherwise or on slow or
 * data-saving connections.
 */
function videoSource(v: HTMLVideoElement) {
  const d = v.dataset;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const slow = !!conn?.effectiveType && /(^|-)2g$|^3g$/.test(conn.effectiveType);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const need = Math.max(innerWidth, innerHeight * 16 / 9) * dpr; // covering pixels across
  const phone = innerWidth < 760;
  const size = slow ? 'sm' : !phone && need > 2200 && d.srcXl ? 'xl' : need > 1500 || innerWidth >= 1100 ? 'lg' : 'sm';
  const webm = v.canPlayType('video/webm; codecs="vp9"') !== '';
  const pick = (kind: 'webm' | 'src') => d[`${kind}${size[0].toUpperCase()}${size.slice(1)}`] ?? d[`${kind}Lg`];
  return (webm && d.webmLg ? pick('webm') : pick('src')) ?? '';
}

/* Pause / play buttons for background videos (work with or without scenes). */
function videoToggles() {
  document.querySelectorAll<HTMLButtonElement>('[data-video-toggle]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    const v = document.getElementById(btn.getAttribute('aria-controls') ?? '') as HTMLVideoElement | null;
    if (!v) return;
    const label = btn.querySelector<HTMLElement>('[data-label]');
    const sync = () => {
      const playing = !v.paused;
      btn.dataset.state = playing ? 'playing' : 'paused';
      if (label) label.textContent = playing ? 'Pause video' : 'Play video';
    };
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    btn.addEventListener('click', () => {
      if (v.paused) {
        if (!v.src) v.src = videoSource(v);
        v.dataset.userPaused = 'false';
        v.play().catch(() => {});
      } else {
        v.dataset.userPaused = 'true';
        v.pause();
      }
    });
    sync();
  });
}

init();
videoToggles();

export {};
