window.M["core/scroll.js"] = (function () {
/* ============================================================
   Smooth scroll + scroll-progress tracks.

   The engine drives the real window scroll position rather than
   translating a wrapper, so position:sticky, IntersectionObserver,
   anchor links, find-in-page and native focus scrolling all keep
   working. One passive scroll listener stores a number. Every
   measurement is cached and refreshed only on resize.
   ============================================================ */

const { onFrame } = window.M["core/raf.js"];
const { clamp, damp, env } = window.M["core/env.js"];

const EASE = 0.085;

class Scroll {
  constructor() {
    this.target = window.scrollY;
    this.current = this.target;
    this.velocity = 0;
    this.max = 0;
    this.progress = 0;
    this.direction = 1;
    this.smooth = false;
    this._lastWritten = -1;
    this._tracks = [];
    this._listeners = new Set();
    this._animatingTo = null;
  }

  init() {
    // Native scrolling on touch. Momentum on a phone beats anything
    // we could simulate, and hijacking it is the fastest way to make
    // a site feel broken on mobile.
    this.smooth = !env.reducedMotion && !env.touch;
    document.documentElement.dataset.scroll = this.smooth ? 'smooth' : 'native';

    this.refresh();

    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('orientationchange', this._onResize, { passive: true });

    if (this.smooth) {
      window.addEventListener('wheel', this._onWheel, { passive: false });
      window.addEventListener('keydown', this._onKey, { passive: true });
    }

    // Late layout shifts (fonts, images) change the document height.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.refresh());
    window.addEventListener('load', () => this.refresh());

    onFrame(this._tick);
    this._update(true);
    return this;
  }

  _onScroll = () => {
    // If the position matches what we wrote this frame, it is our own write.
    // Anything else is the keyboard, the scrollbar, a hash jump or focus
    // moving the page, and we adopt it rather than fighting it.
    if (Math.abs(window.scrollY - this._lastWritten) <= 2) return;
    this.target = window.scrollY;
    this.current = window.scrollY;
    this._animatingTo = null;
  };

  _onWheel = (e) => {
    if (e.ctrlKey) return; // browser zoom
    if (e.target && e.target.closest && e.target.closest('[data-native-scroll]')) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? window.innerHeight : 1;
    this.target = clamp(this.target + e.deltaY * unit, 0, this.max);
    this._animatingTo = null;
  };

  _onKey = () => {
    this._animatingTo = null;
  };

  _onResize = () => {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => this.refresh(), 120);
  };

  /** Recompute document height and every registered track's bounds. */
  refresh() {
    this.max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    for (const t of this._tracks) {
      const rect = t.el.getBoundingClientRect();
      const top = rect.top + scrollY;
      const height = rect.height;
      const b = t.bounds(top, height, vh);
      t.start = b.start;
      t.end = Math.max(b.end, b.start + 1);
    }
    this._update(true);
  }

  _tick = (dt) => {
    if (!this.smooth) {
      const y = window.scrollY;
      this.velocity = y - this.current;
      this.current = y;
      this._update();
      return;
    }

    if (this._animatingTo !== null) {
      this.target = this._animatingTo;
    }

    const next = damp(this.current, this.target, EASE, dt);
    const delta = next - this.current;

    if (Math.abs(this.target - next) < 0.12) {
      this.current = this.target;
      this.velocity = 0;
      this._animatingTo = null;
    } else {
      this.current = next;
      this.velocity = delta;
    }

    if (Math.abs(delta) > 0.05 || this._forceWrite) {
      this._lastWritten = this.current;
      window.scrollTo(0, this.current);
      this._forceWrite = false;
    }

    this._update();
  };

  _update(force) {
    if (this.velocity > 0.2) this.direction = 1;
    else if (this.velocity < -0.2) this.direction = -1;

    this.progress = this.max > 0 ? clamp(this.current / this.max) : 0;

    for (const t of this._tracks) {
      const p = clamp((this.current - t.start) / (t.end - t.start));
      if (force || p !== t.value) {
        t.value = p;
        t.onUpdate(p, this);
      }
    }
    for (const fn of this._listeners) fn(this);
  }

  /**
   * Register a scroll-progress track.
   * `bounds` receives (elementTop, elementHeight, viewportHeight) and
   * returns the document-space scroll range the progress maps across.
   */
  track(el, onUpdate, bounds = Scroll.enterLeave) {
    const t = { el, onUpdate, bounds, start: 0, end: 1, value: -1 };
    this._tracks.push(t);
    const rect = el.getBoundingClientRect();
    const b = bounds(rect.top + window.scrollY, rect.height, window.innerHeight);
    t.start = b.start;
    t.end = Math.max(b.end, b.start + 1);
    return () => {
      const i = this._tracks.indexOf(t);
      if (i > -1) this._tracks.splice(i, 1);
    };
  }

  onUpdate(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** Animated scroll to a document position or element. */
  to(target, { offset = 0, immediate = false } = {}) {
    let y = 0;
    if (typeof target === 'number') y = target;
    else if (target) y = target.getBoundingClientRect().top + window.scrollY + offset;

    y = clamp(y, 0, this.max);

    if (!this.smooth || immediate) {
      window.scrollTo({ top: y, behavior: env.reducedMotion || immediate ? 'auto' : 'smooth' });
      this.target = this.current = y;
      return;
    }
    this._animatingTo = y;
    this.target = y;
    this._forceWrite = true;
  }

  /** Jump without animation. Used after the preloader hands off. */
  reset() {
    window.scrollTo(0, 0);
    this.target = this.current = 0;
    this._animatingTo = null;
    this._update(true);
  }
}

/* ---- Bounds presets ---- */

/** 0 when the element's top reaches the bottom of the viewport, 1 when its bottom leaves the top. */
Scroll.enterLeave = (top, height, vh) => ({ start: top - vh, end: top + height });

/** For sticky sections: 0 when the section top hits the viewport top, 1 when its bottom does. */
Scroll.pin = (top, height, vh) => ({ start: top, end: top + height - vh });

const scroll = new Scroll();

return { scroll, Scroll };
})();
