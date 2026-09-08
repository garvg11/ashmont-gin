(function () {
/* ============================================================
   Ashmont, direction 04 - entry point.

   Order matters. Fonts settle before the display type is split, the
   split happens behind the loader, and the scene only starts driving
   once ScrollTrigger knows the real page height.
   ============================================================ */

const { gsap, ScrollTrigger } = window;
const { env, qualityTier, supportsWebGL, fontsReady } = window.M["core/env.js"];
const { createSmooth } = window.M["core/smooth.js"];
const { createBoot } = window.M["ui/boot.js"];
const { initReveals } = window.M["ui/reveal.js"];
const { initMagnetic, initNav, initDrag, initForm } = window.M["ui/interactions.js"];

async function main() {
  const reducedMotion = env.reducedMotion;
  const boot = createBoot();
  boot.set(12);

  const smooth = createSmooth({ reducedMotion });
  smooth.stop();
  boot.set(28);

  await fontsReady();
  boot.set(56);

  /* Prepared while the loader still covers the page, so the line
     splitter never measures against a font swap. */
  const reveals = initReveals({ reducedMotion });

  initMagnetic({ reducedMotion });
  initNav({ smooth });
  initForm();

  /* ---------- The bottle ---------- */
  const stage = document.getElementById('stage');
  const hole = document.getElementById('product-stage');
  let scene = null;
  let active = false;

  if (supportsWebGL()) {
    const { createScene } = window.M["scene/scene.js"];
    const plate = document.querySelector('.hero .plate__img');
    scene = createScene(stage, {
      tier: qualityTier(),
      reducedMotion,
      /* currentSrc so the ripple layer reuses the exact file the
         browser already picked from the srcset. */
      heroPlate: plate ? (plate.currentSrc || plate.src) : null,
      heroAspect: 2000 / 1500,
    });
    active = true;
    boot.set(88);

    window.ashmont = { scene, smooth, get state() { return scene.debug(); } };

    gsap.ticker.add((time, deltaMs) => {
      if (active && scene) scene.render(Math.min(deltaMs / 1000, 1 / 30));
    });

    /* The pose runs from the top of the hero to the moment the product
       column is centred. Anchored to elements, never to a fraction of a
       guessed page height. */
    const setPose = (self) => scene.setPose(self.progress);
    ScrollTrigger.create({
      trigger: '#top',
      start: 'top top',
      endTrigger: hole,
      end: 'center center',
      scrub: 0.7,
      onUpdate: setPose,
      onRefresh: setPose,
    });

    /* Liveness and grabbing are both derived, never latched, so a
       refresh at a different page height cannot desync them. */
    const sync = (self) => {
      const live = self.progress < 1;
      if (live !== active) {
        active = live;
        stage.dataset.gone = String(!live);
      }
    };
    ScrollTrigger.create({
      trigger: '#product',
      start: 'top bottom',
      endTrigger: '#origins',
      end: 'top center',
      onUpdate: sync,
      onRefresh: sync,
      onLeave: sync,
      onEnterBack: sync,
    });

    /* Drag is only armed while the product section owns the screen. */
    ScrollTrigger.create({
      trigger: '#product',
      start: 'top 40%',
      end: 'bottom 60%',
      onToggle: (self) => { stage.dataset.grab = String(self.isActive); },
    });

    initDrag({ scene, stage });

    if (!reducedMotion) {
      /* One listener drives both the bottle's parallax and the water.
         Coordinates go straight through, so nothing here reads layout. */
      addEventListener('pointermove', (e) => {
        if (!active) return;
        scene.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
        scene.push(e.clientX / innerWidth, 1 - e.clientY / innerHeight, 1);
      }, { passive: true });

      addEventListener('touchmove', (e) => {
        if (!active || !e.touches[0]) return;
        const t = e.touches[0];
        scene.push(t.clientX / innerWidth, 1 - t.clientY / innerHeight, 1.4);
      }, { passive: true });
    }

    /* Once the rippled plate is drawing, the static one underneath is
       redundant. It stays in the markup for no-JS and no-WebGL. */
    const plateEl = document.querySelector('.hero .plate__img');
    if (plateEl) {
      const hidePlate = () => {
        if (scene.waterLive) plateEl.style.opacity = '0';
        else plateEl.style.opacity = '';
      };
      gsap.ticker.add(hidePlate);
    }

    let resizeRaf = 0;
    addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => { scene.resize(); ScrollTrigger.refresh(); });
    });

    addEventListener('pagehide', () => { active = false; scene.dispose(); }, { once: true });
  } else {
    stage.hidden = true;
    boot.set(88);
  }

  document.documentElement.classList.add('ready');

  await boot.finish();
  await boot.lift();
  smooth.start();

  /* The loader locks body overflow, so every measurement taken before
     this point was against a viewport-height document. */
  ScrollTrigger.refresh();

  if (location.hash && document.querySelector(location.hash)) {
    smooth.scrollTo(location.hash, { immediate: true });
    ScrollTrigger.refresh();
  }

  /* ---------- Hero entrance ----------
     The plate lifts, then the headline rises through it line by line.
     The overlap is deliberate: the light arrives while the words are
     still moving. */
  stage.dataset.ready = 'true';

  if (reducedMotion) {
    gsap.set([...reveals.hero.lines, ...reveals.hero.blocks.map((b) => b.el)],
      { opacity: 1, y: 0, yPercent: 0 });
  } else {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero .plate__img', { scale: 1.08, duration: 2.2, ease: 'power2.out' }, 0);
    tl.to(reveals.hero.lines, { yPercent: 0, opacity: 1, duration: 1.25, stagger: 0.1 }, 0.2);
    reveals.hero.blocks.forEach(({ el, delay }) => {
      tl.to(el, { opacity: 1, y: 0, duration: 0.95 }, 0.2 + delay);
    });
  }

  requestAnimationFrame(() => ScrollTrigger.refresh());
}

main().catch((err) => {
  /* A broken scene must never take the copy down with it. */
  console.error('[ashmont]', err);
  document.documentElement.classList.add('js-failed', 'ready');
  document.body.dataset.loading = 'false';
});
})();
