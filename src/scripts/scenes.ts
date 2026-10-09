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

/*
 * Hero: the laptop turns 180 degrees per stop, always the same way, and rests
 * dead straight between turns. Stops: 0 IT Rentals screen, 1 Apple, 2 Dell,
 * 3 HP, 4 Lenovo, 5 the builder's screen (keep in step with Hero.astro).
 * Face A shows the even stops and face B the odd ones; a face only changes stop
 * while it points away from the visitor.
 *
 * Stops 0 to 4 turn while the first screen is pinned. The last turn happens on
 * the way down: the laptop (lifted out of the page, position: fixed) is carried
 * from its place on the first screen to its place beside the builder
 * ([data-dock2], LaptopCurator.astro) as that part of the page scrolls up, and
 * then stays with it. Progress runs from the top of the page to the point where
 * the laptop lands, so the stop positions are worked out from the layout.
 */
let FLIPS: [number, number][] = [[0.02, 0.13], [0.22, 0.33], [0.42, 0.53], [0.62, 0.73], [0.82, 0.93]];
let STOP_AT = [0, 0.175, 0.375, 0.575, 0.775, 1];
/** Share of the progress spent on the first screen (the rest carries the laptop down). */
let PIN = 1;
function layoutTour(pin: number) {
  PIN = pin;
  if (pin >= 1) {
    FLIPS = [[0.02, 0.13], [0.22, 0.33], [0.42, 0.53], [0.62, 0.73], [0.82, 0.93]];
    STOP_AT = [0, 0.175, 0.375, 0.575, 0.775, 1];
    return;
  }
  const r = 1 - pin;
  FLIPS = [[0.03, 0.19], [0.28, 0.44], [0.53, 0.69], [0.78, 0.94]].map(([a, b]) => [a * pin, b * pin] as [number, number]);
  FLIPS.push([pin + 0.12 * r, pin + 0.8 * r]);
  STOP_AT = [0, 0.235, 0.485, 0.735, 0.97].map((u) => u * pin);
  STOP_AT.push(1);
}
/** How far the laptop has been carried from the first screen to the builder (0 to 1). */
const carried = (p: number) => (PIN >= 1 ? 0 : smoother(clamp((p - PIN) / (1 - PIN))));
function smoother(t: number) { return t * t * t * (t * (6 * t - 15) + 10); }

/** Stops passed (k) and progress through the current turn (t). */
function heroTurn(p: number) {
  let k = 0;
  let t = 0;
  for (const [a, b] of FLIPS) {
    if (p >= b) k++;
    else { if (p > a) t = (p - a) / (b - a); break; }
  }
  return { k, t };
}

type HeroParts = {
  slab: HTMLElement; width: number; floor: HTMLElement | null; slots: HTMLElement[]; marks: HTMLElement[];
  sheens: { el: HTMLElement; k: number }[]; track: HTMLElement | null; drift: HTMLElement[];
  front: string; a: number; b: number; stop: number; rest: boolean | null; restDeg: number;
};
const heroParts = new WeakMap<HTMLElement, HeroParts>();

function hero(s: Scene, p: number) {
  let h = heroParts.get(s.el);
  if (!h) {
    const slab = s.el.querySelector<HTMLElement>('[data-slab]');
    if (!slab) return;
    h = {
      slab, width: slab.offsetWidth, floor: s.el.querySelector<HTMLElement>('[data-floor]'),
      slots: [...s.el.querySelectorAll<HTMLElement>('[data-slot]')],
      marks: [...s.el.querySelectorAll<HTMLElement>('[data-s]')],
      // matte Lenovo lid: a fainter highlight
      sheens: [...slab.querySelectorAll<HTMLElement>('.sheen')].map((el) => ({ el, k: el.closest('.back--lenovo') ? 0.45 : 1 })),
      track: s.el.querySelector<HTMLElement>('.tour-track i'),
      drift: [...s.el.querySelectorAll<HTMLElement>('.fl-side, .pocket')],
      front: '', a: -1, b: -1, stop: -1, rest: null, restDeg: NaN,
    };
    heroParts.set(s.el, h);
    // the slab's width only changes on resize; observing it keeps layout reads out of the scroll frame
    const parts = h;
    new ResizeObserver(([entry]) => { parts.width = entry.contentRect.width; }).observe(slab);
  }
  // Too short a window for the pinned tour (phone held sideways, high zoom): the
  // static layout shows the IT Rentals screen, so undo anything the tour set.
  if (!s.pinned) {
    if (h.front === 'static') return;
    h.slab.style.transform = '';
    if (journey) { journey.fly.style.transform = ''; journey.last = ''; }
    h.sheens.forEach(({ el }) => { el.style.transform = ''; el.style.opacity = ''; });
    if (h.floor) { h.floor.style.transform = ''; h.floor.style.opacity = ''; }
    if (h.track) h.track.style.transform = '';
    h.drift.forEach((el) => { el.style.transform = ''; });
    h.slab.dataset.front = 'a';
    h.slots.forEach((el) => el.classList.toggle('on', el.dataset.slot === '0' || el.dataset.slot === '1'));
    showStop(s, h, 0);
    s.el.removeAttribute('data-rest');
    h.front = 'static'; h.a = -1; h.b = -1; h.rest = null; h.restDeg = NaN;
    return;
  }
  // Progress line under the stops, and the icon fields drifting up with the scroll.
  // Written straight onto those few elements: an inherited custom property on the
  // section would restyle every icon in it on every frame.
  if (h.track) h.track.style.transform = `scaleX(${Math.min(1, p / PIN).toFixed(4)})`;
  const lift = `translate3d(0, ${(-p * 70).toFixed(1)}px, 0)`;
  h.drift.forEach((el) => { el.style.transform = lift; });

  const { k, t } = heroTurn(p);
  // the very ends of a turn count as resting, so the laptop is never left a hair off straight
  const e0 = smoother(t);
  const e = e0 < 0.002 ? 0 : e0 > 0.998 ? 1 : e0;
  const deg = (k + e) * 180;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const mid = Math.abs(Math.sin(rad));
  const rest = mid < 0.0005;
  // Resting on the same stop as last frame: nothing to redraw. A jump straight from one
  // stop to another (keyboard focus, a stop button) still needs the new angle.
  const restDeg = rest ? Math.round(deg) : NaN;
  if (!(rest && restDeg === h.restDeg)) {
    h.restDeg = restDeg;
    // Mid-turn the laptop lifts a little and moves back by half its width, so the
    // edge swinging towards the visitor stays the laptop's height. At rest it is
    // exactly flat and straight.
    h.slab.style.transform = rest
      ? `rotateY(${Math.round(deg)}deg)`
      : `translate3d(0, ${(-mid * Math.min(12, h.width * 0.03)).toFixed(2)}px, ${(-mid * h.width * 0.5).toFixed(1)}px) rotateY(${deg.toFixed(2)}deg)`;
    const sweep = `translateX(${(e * 120 - 60).toFixed(1)}%)`;
    h.sheens.forEach(({ el, k: dim }) => { el.style.transform = sweep; el.style.opacity = (mid * 0.9 * dim).toFixed(3); });
    if (h.floor) {
      h.floor.style.transform = `scaleX(${(0.22 + 0.78 * Math.abs(cos)).toFixed(3)})`;
      h.floor.style.opacity = (0.45 + 0.55 * Math.abs(cos)).toFixed(3);
    }
  }
  const front = cos >= 0 ? 'a' : 'b';
  if (front !== h.front) { h.front = front; h.slab.dataset.front = front; }
  const a = Math.min(2 * Math.round(deg / 360), 4);
  const b = Math.min(2 * Math.floor(deg / 360) + 1, 5);
  if (a !== h.a || b !== h.b) {
    h.a = a; h.b = b;
    h.slots.forEach((el) => { const n = Number(el.dataset.slot); el.classList.toggle('on', n === a || n === b); });
  }
  // at rest the laptop is flat, so the live layer for the closing screen can sit on top
  if (rest !== h.rest) { h.rest = rest; s.el.toggleAttribute('data-rest', rest); }
  const stop = t < 0.5 ? k : k + 1;
  if (stop !== h.stop) showStop(s, h, stop);
}

function showStop(s: Scene, h: HeroParts, stop: number) {
  h.stop = stop;
  s.el.dataset.stop = String(stop);
  h.marks.forEach((el) => {
    const on = el.dataset.s === String(stop);
    el.classList.toggle('on', on);
    if (el.tagName === 'BUTTON') { if (on) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); }
  });
}

/** The flying laptop, its place on the first screen and its place beside the builder. */
type Journey = {
  fly: HTMLElement; dock1: HTMLElement; dock2: HTMLElement; stage: HTMLElement;
  active: boolean; x1: number; y1: number; scale: number; last: string;
};
let journey: Journey | null = null;

/** Place the laptop between its two docks; runs every frame while scrolling. */
function carry(p: number, r2: DOMRect | null) {
  const j = journey;
  if (!j || !j.active || !r2) return;
  const e = carried(p);
  const x = j.x1 + (r2.left - j.x1) * e;
  const y = j.y1 + (r2.top - j.y1) * e;
  const sc = 1 + (j.scale - 1) * e;
  // (once off screen it is not painted; it stays in the page for screen readers: the h1 is on it)
  const tf = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
  if (tf === j.last) return;
  j.last = tf;
  j.fly.style.transform = tf;
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
      if (s.name === 'hero') measureJourney(s);
    }
  };

  const header = document.querySelector<HTMLElement>('.site-header');
  const measureJourney = (s: Scene) => {
    const fly = s.el.querySelector<HTMLElement>('[data-fly]');
    const dock1 = fly?.parentElement ?? null;
    const dock2 = document.querySelector<HTMLElement>('[data-dock2]');
    if (!fly || !dock1 || !dock2 || !s.stage) { layoutTour(1); return; }
    journey ??= { fly, dock1, dock2, stage: s.stage, active: false, x1: 0, y1: 0, scale: 1, last: '' };
    const j = journey;
    j.last = '';
    // the laptop's own size (transforms do not change it); the first screen keeps that much room
    const w1 = fly.offsetWidth;
    const h1 = fly.offsetHeight;
    dock1.style.setProperty('--fly-h', `${h1}px`);
    if (!s.pinned || !w1 || dock2.offsetParent === null) {
      j.active = false;
      layoutTour(1);
      return;
    }
    const w2 = dock2.offsetWidth;
    const h2 = (h1 * w2) / w1;
    dock2.style.height = `${h2.toFixed(1)}px`;
    // Where it comes to rest: in the middle of the window beside the builder (where it
    // then stays while the builder scrolls), or under the header on narrow screens.
    const headH = header?.offsetHeight ?? 80;
    const sticky = getComputedStyle(dock2).position === 'sticky';
    const land = sticky ? Math.max(headH + 24, (vh - h2) / 2) : headH + 20;
    dock2.style.top = `${land.toFixed(1)}px`;
    // its place in the page, measured from its column (a stuck element reports where it is stuck)
    const col = dock2.parentElement!;
    const landsAt = col.getBoundingClientRect().top + scrollY - land;
    const P = s.span;
    s.span = Math.max(P + 1, landsAt - s.top);
    j.scale = w2 / w1;
    const r1 = dock1.getBoundingClientRect();
    const rs = s.stage.getBoundingClientRect();
    j.x1 = r1.left - rs.left;
    j.y1 = r1.top - rs.top;
    j.active = true;
    layoutTour(P / s.span);
  };

  const target = (s: Scene, y = scrollY) => {
    if (s.pinned) return clamp((y - s.top) / s.span);
    const top = s.top - y;
    const startY = vh * s.start;
    const endY = vh * s.end;
    return clamp((startY - top) / (startY - endY + s.height));
  };

  let lastFrame = 0;
  let heroRaw = NaN;
  const heroScene = scenes.find((s) => s.name === 'hero');
  let dir = 1;
  let lastY = scrollY;
  const frame = (now = performance.now()) => {
    raf = 0;
    let moving = false;
    // Same feel at 60 and 120 frames a second: 20% of the gap per 60th of a second.
    const dt = lastFrame ? Math.min(64, now - lastFrame) : 16.7;
    const ease = 1 - Math.pow(0.8, dt / 16.7);
    // read the scroll position once, before this frame writes any styles
    const y = scrollY;
    if (y !== lastY) { dir = Math.sign(y - lastY); lastY = y; }
    // where the visitor is in the tour, measured against the current layout (for relayout)
    if (heroScene?.pinned && viewH() === vh) heroRaw = (y - heroScene.top) / heroScene.span;
    const dockRect = journey?.active ? journey.dock2.getBoundingClientRect() : null;
    for (const s of scenes) {
      const t = target(s, y);
      if (s.cur < 0) s.cur = t;
      const d = t - s.cur;
      s.cur = Math.abs(d) < 0.0004 ? t : s.cur + d * ease;
      if (s.cur !== t) moving = true;
      if (Math.abs(s.cur - s.shown) > 0.0002 || s.shown < 0) {
        s.shown = s.cur;
        if (s.name !== 'hero') s.el.style.setProperty('--p', s.cur.toFixed(4));
        handlers[s.name]?.(s, s.cur);
      }
    }
    if (heroScene?.pinned) carry(heroScene.cur, dockRect);
    if (moving) { lastFrame = now; raf = requestAnimationFrame(frame); } else lastFrame = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  let resizeRaf = 0;
  const relayout = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const hs = heroScene;
      // the last stop sits exactly at the end of the tour, so up to the end counts as inside
      const raw = Number.isFinite(heroRaw) ? heroRaw : hs?.pinned ? (scrollY - hs.top) / hs.span : NaN;
      const before = hs?.pinned && raw > 0 && raw <= 1 + 2 / hs.span ? { p: Math.min(raw, 1), top: hs.top, span: hs.span } : null;
      const wasPinned = scenes.map((s) => s.pinned);
      measure();
      // A resize or rotation changes the tour's length: stay on the same stop rather
      // than the same pixel offset (which would land mid-turn or on another brand).
      if (hs?.pinned && before && (Math.abs(hs.span - before.span) > 1 || Math.abs(hs.top - before.top) > 1)) {
        window.scrollTo({ top: hs.top + before.p * hs.span, behavior: 'instant' as ScrollBehavior });
      }
      // a scene that switches between pinned and static jumps to where it should be
      // instead of easing across several turns
      scenes.forEach((s, i) => { if (s.pinned !== wasPinned[i]) s.cur = -1; s.shown = -1; });
      heroRaw = before && hs?.pinned ? before.p : NaN;
      // An on-screen keyboard that shrinks the window can switch the tour to the static
      // layout while the visitor types in it: keep what they are typing in view.
      const a = document.activeElement as HTMLElement | null;
      if (a && a.matches('input, textarea') && scenes.some((s, i) => wasPinned[i] && !s.pinned && s.el.contains(a))) {
        a.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      }
      kick();
      if (hs?.pinned) { clearTimeout(settleTimer); settleTimer = window.setTimeout(settle, 240); }
    });
  };

  // Keyboard users: tabbing into a part of a pinned scene that is not on
  // screen yet scrolls to where that part is visible.
  const onFocus = (e: FocusEvent) => {
    const t = e.target as HTMLElement;
    for (const s of scenes) {
      if (!s.pinned || !s.el.contains(t)) continue;
      const anchor = t.closest<HTMLElement>('[data-at], [data-at-stop]');
      if (!anchor) continue;
      const at = anchor.dataset.atStop != null ? STOP_AT[Number(anchor.dataset.atStop)] : parseFloat(anchor.dataset.at!);
      if (at == null || Number.isNaN(at)) continue;
      const want = s.top + at * s.span;
      if (Math.abs(scrollY - want) > 4) {
        window.scrollTo({ top: want, behavior: 'instant' as ScrollBehavior });
        s.cur = at;
        kick();
      }
    }
  };

  // Hero: a visitor who stops partway through a turn is eased on to the next stop in
  // the direction they were scrolling (one wheel notch or arrow press is enough to
  // move on; easing back would trap them). Never while a finger is on the screen.
  let settleTimer = 0;
  let touching = false;
  const settle = () => {
    const s = heroScene;
    if (!s || !s.pinned || touching) return;
    const p = target(s);
    const f = FLIPS.find(([a, b]) => p > a + 0.001 && p < b - 0.001);
    if (!f) return;
    const to = dir > 0 ? f[1] + 0.012 : f[0] - 0.012;
    window.scrollTo({ top: s.top + to * s.span, behavior: 'smooth' });
  };
  const onScrollSettle = () => {
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, 240);
  };
  const onTouchStart = () => { touching = true; clearTimeout(settleTimer); };
  const onTouchEnd = (e: TouchEvent) => {
    touching = e.touches.length > 0;
    clearTimeout(settleTimer);
    if (!touching) settleTimer = window.setTimeout(settle, 240);
  };

  // Hero stop buttons: go to a stop. Further than one stop away, jump to the turn
  // just before it first, so the visitor sees one turn rather than a long spin.
  let cancelMove = () => {};
  const onClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]');
    const s = heroScene;
    if (!btn || !s || !s.pinned || !s.el.contains(btn)) return;
    e.preventDefault();
    cancelMove();
    const i = Number(btn.dataset.goto);
    const from = heroParts.get(s.el)?.stop ?? 0;
    if (Math.abs(i - from) > 1) {
      const pre = i > from ? FLIPS[i - 1][0] - 0.004 : FLIPS[i][1] + 0.004;
      window.scrollTo({ top: s.top + pre * s.span, behavior: 'instant' as ScrollBehavior });
      s.cur = pre;
      kick();
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: s.top + STOP_AT[i] * s.span, behavior: 'smooth' });
      // From the keyboard, carry focus on to what that stop offers (its catalogue link,
      // or the describe-your-need field), so the next Tab does not turn the laptop back.
      if (e.detail !== 0 || i === 0) return;
      const to = i === STOP_AT.length - 1 ? document.querySelector<HTMLElement>('[data-need] [name="need"]') : s.el.querySelector<HTMLElement>(`.tc[data-s="${i}"] a`);
      if (!to) return;
      // only if the visitor has not moved on in the meantime (Tab, the skip link, a click)
      let timer = 0;
      const move = () => {
        cancelMove();
        if (document.activeElement === btn) to.focus({ preventScroll: true });
      };
      cancelMove = () => { removeEventListener('scrollend', move); clearTimeout(timer); cancelMove = () => {}; };
      addEventListener('scrollend', move, { once: true });
      timer = window.setTimeout(move, 900);
    });
  };

  measure();
  frame();
  addEventListener('scroll', kick, { passive: true });
  if (heroScene) {
    addEventListener('scroll', onScrollSettle, { passive: true });
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchend', onTouchEnd, { passive: true });
    addEventListener('touchcancel', onTouchEnd, { passive: true });
    heroScene.el.addEventListener('click', onClick);
  }
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  document.fonts?.ready.then(relayout);
  const ro = new ResizeObserver(relayout);
  ro.observe(document.body);
  // the flying laptop is out of the page flow: watch it and its landing place directly
  if (journey) { ro.observe(journey.fly); ro.observe(journey.dock2.parentElement!); }
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
      removeEventListener('scroll', onScrollSettle);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchend', onTouchEnd);
      removeEventListener('touchcancel', onTouchEnd);
      heroScene?.el.removeEventListener('click', onClick);
      clearTimeout(settleTimer);
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
