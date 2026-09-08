(function () {
/* ============================================================
   Ashmont, direction 03 — entry point.

   Order matters here. Fonts settle before the display type is split,
   the split happens behind the loader, and the scene only starts
   driving once ScrollTrigger knows the real page height.
   ============================================================ */

const { env, qualityTier, supportsWebGL, fontsReady } = window.M["core/env.js"];
const { createSmooth } = window.M["core/smooth.js"];
const { createBoot } = window.M["ui/boot.js"];
const { initReveals } = window.M["ui/reveal.js"];
const { initCursor, initMagnetic, initNav, initForm } = window.M["ui/interactions.js"];

const { gsap, ScrollTrigger } = window;

async function main() {
  const reducedMotion = env.reducedMotion;
  const boot = createBoot();
  boot.set(12);

  const smooth = createSmooth({ reducedMotion });
  smooth.stop();
  boot.set(28);

  await fontsReady();
  boot.set(58);

  /* Reveals are prepared while the loader still covers the page, so
     the line splitter never measures against a font swap. */
  const reveals = initReveals({ reducedMotion });

  initCursor({ reducedMotion });
  initMagnetic({ reducedMotion });
  initNav({ smooth });
  initForm();

  /* ---------- The scene ---------- */
  const stage = document.getElementById('stage');
  const surface = document.querySelector('.surface');
  let scene = null;
  let active = false;

  if (supportsWebGL()) {
    const { createScene } = (window.M["scene/scene.js"]);
    scene = createScene(stage, { tier: qualityTier(), reducedMotion });
    active = true;
    boot.set(88);

    /* A handle for tuning the scene from the console. The whole point
       of a procedural bottle is that its numbers stay editable. */
    window.ashmont = { scene, get progress() { return scene.debug(); } };

    /* One clock. The scene renders inside GSAP's ticker so it can
       never fall out of step with Lenis or with ScrollTrigger. */
    gsap.ticker.add((time, deltaMs) => {
      if (active && scene) scene.render(Math.min(deltaMs / 1000, 1 / 30));
    });

    /* Two ranges, each anchored to an element rather than to a
       fraction of a guessed total. The bottle travels while the copy
       is arriving; the water only leaves once the copy has gone. */
    const copy = surface.querySelector('.surface__copy');

    const setPose = (self) => scene.setPose(self.progress);
    ScrollTrigger.create({
      trigger: '#top',
      start: 'top top',
      endTrigger: copy,
      end: 'bottom 40%',
      scrub: 0.6,
      onUpdate: setPose,
      onRefresh: setPose,
    });

    /* The drain runs across the surface section's held tail, which is
       a full viewport of water with nothing to read in it. Liveness is
       derived here rather than latched, so a refresh cannot desync it. */
    const setDrain = (self) => {
      scene.setDrain(self.progress);
      const live = self.progress < 1;
      if (live === active) return;
      active = live;
      stage.dataset.gone = String(!live);
    };
    ScrollTrigger.create({
      trigger: copy,
      start: 'bottom top',
      endTrigger: surface,
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: setDrain,
      onRefresh: setDrain,
      onLeave: setDrain,
      onEnterBack: setDrain,
    });

    /* Pointer pushes the pool. Coordinates go straight to the shader
       in 0..1 with y flipped, so nothing here reads layout. */
    if (!reducedMotion) {
      addEventListener('pointermove', (e) => {
        if (!active) return;
        scene.push(e.clientX / innerWidth, 1 - e.clientY / innerHeight, 1);
      }, { passive: true });

      addEventListener('touchmove', (e) => {
        if (!active || !e.touches[0]) return;
        const t = e.touches[0];
        scene.push(t.clientX / innerWidth, 1 - t.clientY / innerHeight, 1.4);
      }, { passive: true });
    }

    let resizeRaf = 0;
    addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        scene.resize();
        ScrollTrigger.refresh();
      });
    });

    addEventListener('pagehide', () => { active = false; scene.dispose(); }, { once: true });
  } else {
    /* No WebGL: the stage keeps its flat navy ground and the hero
       still reads. Nothing else changes. */
    stage.classList.add('stage--flat');
    boot.set(88);
  }

  document.documentElement.classList.add('ready');

  await boot.finish();
  await boot.lift();
  smooth.start();

  /* The loader locks body overflow, so every measurement taken before
     this point was against a viewport-height document. */
  ScrollTrigger.refresh();

  /* A deep link is jumped to, not animated. The loader has already
     eaten the browser's own hash scroll by locking the body. */
  if (location.hash && document.querySelector(location.hash)) {
    smooth.scrollTo(location.hash, { immediate: true });
    ScrollTrigger.refresh();
  }

  /* ---------- Hero entrance ----------
     A single drop lands, the pool answers, and the type rises through
     the settling water. The stage fade and the first line overlap by
     design: the light arrives while the words are still moving. */
  stage.dataset.ready = 'true';
  if (scene && !reducedMotion) scene.push(0.54, 0.66, 3.2);

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  if (reducedMotion) {
    gsap.set([...reveals.hero.lines, ...reveals.hero.blocks.map((b) => b.el)],
      { opacity: 1, y: 0, yPercent: 0 });
  } else {
    tl.to(reveals.hero.lines, {
      yPercent: 0,
      opacity: 1,
      duration: 1.3,
      stagger: 0.11,
    }, 0.25);

    reveals.hero.blocks.forEach(({ el, delay }) => {
      tl.to(el, { opacity: 1, y: 0, duration: 0.95 }, 0.25 + delay);
    });
  }

  /* Anything that changed height while the loader was up. */
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

main().catch((err) => {
  /* A broken scene must never take the copy down with it. */
  console.error('[ashmont]', err);
  document.documentElement.classList.add('js-failed', 'ready');
  document.body.dataset.loading = 'false';
});

})();
