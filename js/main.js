(function () {
/* ============================================================
   ASHMONT GIN
   Entry point. Boots in a deliberate order: chrome first so the page
   is usable, then layout-dependent sequences, then the 3D scene last
   because it is the only optional part.
   ============================================================ */

const { scroll } = window.M["core/scroll.js"];
const { qualityTier, supportsWebGL, fontsReady, env, onReducedMotionChange } = window.M["core/env.js"];
const { createBoot } = window.M["ui/boot.js"];
const { initReveals, revealAboveFold } = window.M["ui/reveal.js"];
const { initCursor, initMagnetic, initNav, initTheme, initAccordion, initForm } = window.M["ui/interactions.js"];
const { initPan, initStack, initManifesto, initParallax, initChrome, initAnchors } = window.M["ui/sequences.js"];

const boot = createBoot();

/* Whatever happens below, the curtain lifts. A slow CDN image, a stalled
   module import or a backgrounded tab must never leave someone staring at
   a loading screen. */
const watchdog = setTimeout(() => boot.enter(), 6000);

async function start() {
  // 1. Chrome. Works with or without anything that follows.
  initTheme();
  initNav();
  initAccordion();
  initForm();
  initAnchors();
  initCursor();
  initMagnetic();
  boot.progress(0.15);

  // 2. Type is split before anything measures, so heights are final.
  await fontsReady();
  initReveals();
  boot.progress(0.4);

  // 3. Scroll engine, then everything that depends on measured layout.
  scroll.init();
  initManifesto();
  initPan();
  initStack();
  initParallax();
  initChrome();
  scroll.refresh();
  boot.progress(0.6);

  // 4. The scene. Optional by design: if WebGL is missing or the module
  //    fails to load, the page keeps its atmosphere from CSS alone.
  let scene = null;
  const container = document.getElementById('scene');

  if (container && supportsWebGL()) {
    try {
      const { createScene } = (window.M["scene/scene.js"]);
      scene = createScene(container, { tier: qualityTier() });
      scroll.onUpdate((s) => scene.setProgress(s.progress));
      window.addEventListener('load', () => scene.refresh());
    } catch (err) {
      console.warn('[ashmont] 3D scene unavailable, continuing without it.', err);
      container.remove();
    }
  } else if (container) {
    container.remove();
  }

  boot.progress(0.9);

  // 5. Wait for the real page load, but never hold the door more than 3s.
  await Promise.race([
    new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true }))),
    new Promise((r) => setTimeout(r, 3000)),
  ]);

  boot.progress(1);
  clearTimeout(watchdog);
  await boot.enter();

  // 6. Post-entry settle. The hero is on screen now, so measure once more
  //    and reveal whatever is already in view.
  scroll.reset();
  scroll.refresh();
  if (scene) scene.refresh();
  revealAboveFold();

  // Local development handle. Never defined on a deployed host.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.__ashmont = { scroll, scene };
  }

  // Preference can change mid-session. Re-measure rather than reload.
  onReducedMotionChange(() => {
    scroll.refresh();
    if (scene) scene.refresh();
  });
}

start().catch((err) => {
  console.error('[ashmont] boot failed', err);
  // Never leave the reader stuck behind a curtain because of a script error.
  document.body.dataset.locked = 'false';
  const pre = document.getElementById('preloader');
  if (pre) pre.style.display = 'none';
  document.querySelectorAll('[data-reveal], [data-reveal-media]').forEach((el) => {
    if (el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'in');
    if (el.hasAttribute('data-reveal-media')) el.setAttribute('data-reveal-media', 'in');
  });
});

})();
