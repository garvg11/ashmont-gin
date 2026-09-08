window.M["ui/boot.js"] = (function () {
/* ============================================================
   The preloader.

   Real progress against real work: the webfonts, the module graph,
   and the first rendered frame of the scene. The counter is allowed
   to arrive early but never to arrive late, and it wipes upward so
   the hero entrance starts from the bottom of the same motion.
   ============================================================ */

function createBoot() {
  const root = document.getElementById('boot');
  const bar = document.getElementById('boot-bar');
  const num = document.getElementById('boot-num');

  let shown = 0;
  let target = 0;
  let raf = 0;
  let done = null;

  const tick = () => {
    shown += (target - shown) * 0.12;
    if (target >= 100 && 100 - shown < 0.4) shown = 100;
    bar.style.width = `${shown}%`;
    num.textContent = String(Math.round(shown));
    if (shown >= 100) {
      cancelAnimationFrame(raf);
      done && done();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    /** @param {number} v 0..100 */
    set(v) { target = Math.max(target, Math.min(v, 100)); },

    /** Resolves once the counter has visually reached 100.
        A background tab pauses rAF, so the counter can stall at
        whatever it last drew. The timeout is what stops someone
        returning to a tab that is still loading a loaded page. */
    finish() {
      target = 100;
      return Promise.race([
        new Promise((resolve) => { done = resolve; }),
        new Promise((resolve) => setTimeout(resolve, 1400)),
      ]);
    },

    /** Lift the curtain. Resolves when the wipe is over. */
    lift() {
      document.body.dataset.loading = 'false';
      root.setAttribute('aria-hidden', 'true');
      return new Promise((resolve) => setTimeout(resolve, 620));
    },
  };
}

return { createBoot };
})();
