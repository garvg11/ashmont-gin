/* ============================================================
   Smooth scrolling.

   Lenis owns the scroll position, GSAP owns the clock, and
   ScrollTrigger listens to Lenis rather than to the window. One
   ticker, one source of truth, no competing rAF loops.
   ============================================================ */

export function createSmooth({ reducedMotion = false } = {}) {
  const { gsap, ScrollTrigger, Lenis } = window;

  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);

  if (reducedMotion) {
    /* Native scrolling, native anchor jumps, no interpolation. */
    return {
      lenis: null,
      scrollTo(target) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) el.scrollIntoView();
      },
      stop() {},
      start() {},
      destroy() {},
    };
  }

  const lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
    smoothWheel: true,
    /* Touch devices keep their native momentum. Overriding it is the
       single fastest way to make a phone feel broken. */
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));

  return {
    lenis,
    scrollTo(target, opts) {
      lenis.scrollTo(target, { duration: 1.15, ...opts });
    },
    stop() { lenis.stop(); },
    start() { lenis.start(); },
    destroy() { lenis.destroy(); },
  };
}
