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

/* Hero: the laptop boots as each brand, then as IT Rentals (keep in step with Hero.astro). */
const BRANDS = ['apple', 'hp', 'dell', 'lenovo', 'itr'] as const;
const BRAND_STOPS = [0.17, 0.34, 0.51, 0.68];

function hero(s: Scene, p: number) {
  let i = BRAND_STOPS.findIndex((stop) => p < stop);
  if (i === -1) i = BRANDS.length - 1;
  const brand = BRANDS[i];
  if (s.el.dataset.brand !== brand) {
    s.el.dataset.brand = brand;
    s.el.querySelectorAll<HTMLElement>('[data-b]').forEach((n) => n.classList.toggle('on', n.dataset.b === brand));
  }
  const from = i === 0 ? 0 : BRAND_STOPS[i - 1];
  const to = BRAND_STOPS[i] ?? 1;
  s.el.style.setProperty('--seg', clamp((p - from) / (to - from)).toFixed(3));
}

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

const handlers: Record<string, (s: Scene, p: number) => void> = { hero, steps, qa, route };

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
    start: parseFloat(el.dataset.start ?? '0.9'),
    end: parseFloat(el.dataset.end ?? '0.4'),
    cur: -1,
    shown: -1,
  }));
  if (!scenes.length) return;

  let vh = innerHeight;
  let raf = 0;

  const measure = () => {
    vh = innerHeight;
    for (const s of scenes) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + scrollY;
      s.height = r.height;
      s.pinned = !!s.stage && getComputedStyle(s.stage).position === 'sticky' && r.height > vh * 1.2;
    }
  };

  const target = (s: Scene) => {
    if (s.pinned) return clamp((scrollY - s.top) / (s.height - vh));
    const top = s.top - scrollY;
    const startY = vh * s.start;
    const endY = vh * s.end;
    return clamp((startY - top) / (startY - endY + s.height));
  };

  const frame = () => {
    raf = 0;
    let moving = false;
    for (const s of scenes) {
      const t = target(s);
      if (s.cur < 0) s.cur = t;
      const d = t - s.cur;
      s.cur = Math.abs(d) < 0.0004 ? t : s.cur + d * 0.2;
      if (s.cur !== t) moving = true;
      if (Math.abs(s.cur - s.shown) > 0.0002 || s.shown < 0) {
        s.shown = s.cur;
        s.el.style.setProperty('--p', s.cur.toFixed(4));
        handlers[s.name]?.(s, s.cur);
      }
    }
    if (moving) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  let resizeRaf = 0;
  const relayout = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { measure(); kick(); });
  };

  // Keyboard users: tabbing into a part of a pinned scene that is not on
  // screen yet scrolls to where that part is visible.
  const onFocus = (e: FocusEvent) => {
    const t = e.target as HTMLElement;
    for (const s of scenes) {
      if (!s.pinned || !s.el.contains(t)) continue;
      const at = t.closest<HTMLElement>('[data-at]')?.dataset.at;
      if (at == null) continue;
      const want = s.top + parseFloat(at) * (s.height - vh);
      if (Math.abs(scrollY - want) > 4) {
        window.scrollTo({ top: want, behavior: 'instant' as ScrollBehavior });
        s.cur = parseFloat(at);
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

/* WebM (VP9) where supported, MP4 (H.264) otherwise; the smaller file on smaller screens. */
function videoSource(v: HTMLVideoElement) {
  const big = innerWidth >= 1100;
  const webm = v.canPlayType('video/webm; codecs="vp9"') !== '' && v.dataset.webmLg;
  if (webm) return (big ? v.dataset.webmLg : v.dataset.webmSm) ?? '';
  return (big ? v.dataset.srcLg : v.dataset.srcSm) ?? '';
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
