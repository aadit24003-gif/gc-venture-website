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

function smoother(t: number) { return t * t * t * (t * (6 * t - 15) + 10); }

/*
 * Hero: the first screen stays put while the visitor scrolls, and the laptop
 * grows until its screen fills the window while the screen's words fade; the
 * next section (LaptopCurator.astro, pulled up over the end of the hero) then
 * rises over it. Written straight onto those few elements, not as an inherited
 * custom property (which would restyle every icon in the section each frame).
 */
type HeroParts = {
  stage: HTMLElement; device: HTMLElement; screen: HTMLElement; desk: HTMLElement | null;
  fades: HTMLElement[];
  geo: { dx: number; dy: number; s: number } | null; still: boolean;
};
const heroParts = new WeakMap<HTMLElement, HeroParts>();

/** Offset of `el` inside `box`, ignoring transforms (the lid is still opening on load). */
function offsetIn(el: HTMLElement, box: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== box) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
  return { x, y };
}

function hero(s: Scene, p: number) {
  let h = heroParts.get(s.el);
  if (!h) {
    const stage = s.stage;
    const device = s.el.querySelector<HTMLElement>('[data-device]');
    const screen = s.el.querySelector<HTMLElement>('[data-screen]');
    if (!stage || !device || !screen) return;
    h = {
      stage, device, screen, desk: s.el.querySelector<HTMLElement>('[data-desk]'),
      fades: [...s.el.querySelectorAll<HTMLElement>('[data-fade]')],
      geo: null, still: false,
    };
    heroParts.set(s.el, h);
  }
  // Too short a window for the pinned version: everything shows as laid out.
  if (!s.pinned) {
    if (h.still) return;
    h.still = true;
    h.device.style.transform = '';
    h.device.style.transformOrigin = '';
    for (const el of [...h.fades, h.desk]) if (el) el.style.opacity = '';
    return;
  }
  h.still = false;
  if (!h.geo) {
    // where the screen sits in the window, and how much it must grow to fill it
    const sw = h.screen.offsetWidth;
    const sh = h.screen.offsetHeight;
    const o = offsetIn(h.screen, h.device);
    const d = offsetIn(h.device, h.stage);
    const W = h.stage.clientWidth;
    const H = h.stage.clientHeight;
    h.device.style.transformOrigin = `${(o.x + sw / 2).toFixed(1)}px ${(o.y + sh / 2).toFixed(1)}px`;
    h.geo = {
      dx: W / 2 - (d.x + o.x + sw / 2),
      dy: H / 2 - (d.y + o.y + sh / 2),
      s: Math.max(W / sw, H / sh) * 1.06,
    };
  }
  const g = h.geo;
  const z = smoother(clamp((p - 0.02) / 0.46));
  h.device.style.transform = z === 0 ? '' : `translate3d(${(g.dx * z).toFixed(1)}px, ${(g.dy * z).toFixed(1)}px, 0) scale(${(1 + (g.s - 1) * z).toFixed(4)})`;
  const out = (1 - clamp(p / 0.14)).toFixed(3);
  h.fades.forEach((el) => { el.style.opacity = out; });
  // faded early: on its own layer, a fully clear screen costs nothing while the laptop
  // keeps growing (and the page's h1 on it stays readable to screen readers)
  if (h.desk) h.desk.style.opacity = (1 - clamp((p - 0.06) / 0.2)).toFixed(3);
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
      const h = heroParts.get(s.el);
      if (h) h.geo = null;
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
      // the hero's zoom follows the scroll exactly (its glide is already smooth), so the
      // laptop and the page rising over it never drift apart
      if (s.cur < 0 || s.name === 'hero') s.cur = t;
      const d = t - s.cur;
      s.cur = Math.abs(d) < 0.0004 ? t : s.cur + d * ease;
      if (s.cur !== t) moving = true;
      if (Math.abs(s.cur - s.shown) > 0.0002 || s.shown < 0) {
        s.shown = s.cur;
        if (s.name !== 'hero') s.el.style.setProperty('--p', s.cur.toFixed(4));
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

  // Hero: no stopping halfway through the zoom. Once the visitor scrolls down from
  // the first screen, the page glides on until the next section (#build) fills the
  // window. Coming back up from further down, the page stops there first; one more,
  // separate push glides back to the top. Wheel, touch and scroll keys wait while it
  // moves, so they cannot leave it in between.
  const heroScene = scenes.find((s) => s.name === 'hero');
  const landing = document.getElementById('build');
  let glideRaf = 0;
  /** a trackpad's momentum keeps sending wheel events after a glide lands: let them pass only after this */
  let holdUntil = 0;
  let lastY = scrollY;
  // A "push" is one gesture: a touch, a key press, or a run of wheel events with no
  // pause longer than GAP (a trackpad's momentum counts as part of the same push).
  const GAP = 260;
  let gesture = 0;
  let lastWheel = -Infinity;
  /** stopped at the describe page on the way up; the push that brought it there */
  let parked = false;
  let parkedBy = -1;
  const newGesture = () => { gesture++; };
  const topY = () => Math.max(0, heroScene?.top ?? 0);
  const landY = () => (landing ? Math.round(landing.getBoundingClientRect().top + scrollY) : 0);
  const glide = (to: number, minDur = 900) => {
    cancelAnimationFrame(glideRaf);
    if (Math.abs(to - scrollY) < 2) return;
    // the wheel's own smooth scroll may still be moving: start from wherever it has got
    // to on the first frame (never pull back), and take over from there
    let from = NaN;
    let d = 0;
    let dur = 0;
    let t0 = 0;
    // Starts moving straight away (the visitor is already scrolling) and settles
    // gently: a sine ease-out, softened at the start so there is no jolt.
    const curve = (t: number) => 0.85 * Math.sin((t * Math.PI) / 2) + 0.15 * (1 - Math.cos(t * Math.PI)) / 2;
    const step = (now: number) => {
      if (Number.isNaN(from)) {
        from = scrollY;
        d = to - from;
        dur = Math.min(1500, Math.max(minDur, Math.abs(d) * 0.85));
        t0 = now;
      }
      const t = Math.min(1, (now - t0) / dur);
      const e = curve(t);
      window.scrollTo({ top: from + d * e, behavior: 'instant' as ScrollBehavior });
      if (t < 1) glideRaf = requestAnimationFrame(step);
      else {
        glideRaf = 0;
        lastY = scrollY;
        holdUntil = performance.now() + 350;
        // resting at the describe page counts as stopped there: the next push up goes on
        if (landing && Math.abs(scrollY - landY()) <= 4) { parked = true; parkedBy = gesture; }
      }
    };
    glideRaf = requestAnimationFrame(step);
  };
  const park = (land: number) => {
    parked = true;
    parkedBy = gesture;
    glide(land, 320);
  };
  const onScrollGlide = () => {
    const y = scrollY;
    const prev = lastY;
    const dir = y - prev;
    lastY = y;
    if (glideRaf || !heroScene?.pinned || !landing) return;
    const top = topY();
    const land = landY();
    if (y > land + 4) parked = false;
    if (y <= top + 2 || y >= land - 2) return;
    if (dir >= 0) { parked = false; glide(land); return; }
    // Going up into the zoom from the describe page or below it: stop at the describe
    // page first, unless this is a new push after stopping there
    if (prev >= land - 2) {
      if (parked && gesture !== parkedBy) { parked = false; glide(top); }
      else park(land);
      return;
    }
    glide(top);
  };
  const SCROLL_KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End']);
  const holdInput = (e: Event) => {
    if (e instanceof KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (!SCROLL_KEYS.has(e.key) || e.altKey || e.ctrlKey || e.metaKey || t?.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      if (glideRaf) { e.preventDefault(); return; }
      // Scroll keys on the first screen glide instead of starting the browser's own
      // smooth scroll (which would carry on past the landing point)
      if (!heroScene?.pinned || !landing) return;
      const y = scrollY;
      const top = topY();
      const land = landY();
      const down = e.key === 'PageDown' || e.key === 'ArrowDown' || (e.key === ' ' && !e.shiftKey);
      const up = e.key === 'PageUp' || e.key === 'ArrowUp' || (e.key === ' ' && e.shiftKey);
      newGesture();
      if (down && y < land - 2) { e.preventDefault(); parked = false; glide(land); }
      else if (up && y > top + 2 && y <= land + 2) { e.preventDefault(); parked = false; glide(top); }
      return;
    }
    if (e.type === 'touchmove') { if (glideRaf) e.preventDefault(); return; }
    // wheel
    const w = e as WheelEvent;
    const now = performance.now();
    if (now - lastWheel > GAP) newGesture();
    lastWheel = now;
    if (glideRaf || now < holdUntil) { e.preventDefault(); return; }
    if (!heroScene?.pinned || !landing) return;
    const y = scrollY;
    const land = landY();
    const dy = w.deltaY * (w.deltaMode === 1 ? 16 : w.deltaMode === 2 ? innerHeight : 1);
    if (dy >= 0) return;
    if (parked && Math.abs(y - land) <= 4) {
      // stopped at the describe page: the rest of that push is ignored, a new one goes on up
      e.preventDefault();
      if (gesture !== parkedBy) { parked = false; glide(topY()); }
      return;
    }
    // on the way up, a push that would carry past the describe page stops there
    if (y >= land - 2 && y + dy < land - 2) { e.preventDefault(); park(land); }
  };
  // "Describe your need, or build your own" on the first screen glides there too
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-to-describe]');
    if (!a || !heroScene?.pinned || !landing) return;
    e.preventDefault();
    glide(landY());
  };

  measure();
  frame();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('scroll', onScrollGlide, { passive: true });
  addEventListener('wheel', holdInput, { passive: false });
  addEventListener('touchmove', holdInput, { passive: false });
  addEventListener('touchstart', newGesture, { passive: true });
  addEventListener('mousedown', newGesture, { passive: true });
  addEventListener('keydown', holdInput);
  heroScene?.el.addEventListener('click', onClick);
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
      removeEventListener('scroll', onScrollGlide);
      removeEventListener('wheel', holdInput);
      removeEventListener('touchmove', holdInput);
      removeEventListener('touchstart', newGesture);
      removeEventListener('mousedown', newGesture);
      removeEventListener('keydown', holdInput);
      heroScene?.el.removeEventListener('click', onClick);
      cancelAnimationFrame(glideRaf);
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
