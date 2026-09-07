/* ============================================================
   Scroll sequences: horizontal pan, sticky stack, kinetic manifesto,
   parallax, progress. Each one earns its place:

   pan       tells you the botanicals are a sequence you move through
   stack     tells you distillation is ordered steps, one after another
   manifesto makes reading itself the animation
   parallax  puts the coast behind the type instead of under it
   ============================================================ */

import { scroll, Scroll } from '../core/scroll.js';
import { clamp, lerp, env } from '../core/env.js';

/* ---------- 3. Botanicals: vertical scroll drives horizontal travel ---------- */

export function initPan() {
  const section = document.querySelector('[data-pan]');
  if (!section) return;

  const track = section.querySelector('[data-pan-track]');
  const indexEl = section.querySelector('[data-pan-index]');
  const cards = [...track.children];
  let distance = 0;
  let untrack = null;

  const setIndex = (i) => {
    if (indexEl) indexEl.textContent = String(i + 1).padStart(2, '0');
  };

  const measure = () => {
    if (env.mobile || env.reducedMotion) {
      section.style.removeProperty('--pan-dist');
      track.style.transform = '';
      distance = 0;
      return;
    }
    // Travel needed = full track width minus what already fits on screen.
    distance = Math.max(0, track.scrollWidth - window.innerWidth);
    section.style.setProperty('--pan-dist', `${distance}px`);
  };

  const bind = () => {
    if (untrack) {
      untrack();
      untrack = null;
    }
    if (env.mobile || env.reducedMotion || distance <= 0) return;

    untrack = scroll.track(
      section,
      (p) => {
        track.style.transform = `translate3d(${-distance * p}px, 0, 0)`;
        setIndex(Math.min(cards.length - 1, Math.round(p * (cards.length - 1))));
      },
      Scroll.pin
    );
  };

  const refresh = () => {
    measure();
    bind();
    scroll.refresh();
  };

  /* Cards live inside a pinned, clipped, horizontally translated track, so
     most of them are never "intersecting" in the IntersectionObserver
     sense and would stay clipped forever. Reveal them from the section
     itself, staggered, which is also the better choreography: the row
     arrives as one row. */
  if ('IntersectionObserver' in window && !env.reducedMotion) {
    const revealIO = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        cards.forEach((card, i) => {
          const media = card.querySelector('[data-reveal-media]');
          if (media) {
            media.style.setProperty('--delay', `${Math.min(i, 5) * 70}ms`);
            media.setAttribute('data-reveal-media', 'in');
          }
          card.querySelectorAll('[data-reveal]').forEach((el) => el.setAttribute('data-reveal', 'in'));
        });
        revealIO.disconnect();
      },
      { threshold: 0.02 }
    );
    revealIO.observe(section);
  } else {
    cards.forEach((card) => {
      const media = card.querySelector('[data-reveal-media]');
      if (media) media.setAttribute('data-reveal-media', 'in');
    });
  }

  refresh();
  window.addEventListener('resize', debounce(refresh, 160), { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);

  // On mobile the track is a native snap carousel, so read the index from it.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!env.mobile) return;
        for (const e of entries) {
          if (e.isIntersecting) setIndex(cards.indexOf(e.target));
        }
      },
      { root: track, threshold: 0.6 }
    );
    cards.forEach((c) => io.observe(c));
  }
}

/* ---------- 4. Distillation: sticky stack ---------- */

export function initStack() {
  const stages = [...document.querySelectorAll('[data-stage]')];
  if (stages.length < 2) return;

  // Each card recedes as the next one rises over it, so the stack reads
  // as depth rather than as a list that happens to scroll.
  stages.forEach((stage, i) => {
    if (i === stages.length - 1) return;
    const card = stage.querySelector('.stage__card');
    const next = stages[i + 1];

    scroll.track(
      next,
      (p) => {
        if (env.mobile || env.reducedMotion) {
          card.style.transform = '';
          card.style.opacity = '';
          return;
        }
        card.style.transform = `scale(${lerp(1, 0.93, p)}) translate3d(0, ${lerp(0, -26, p)}px, 0)`;
        card.style.opacity = String(lerp(1, 0.3, p));
      },
      (top, height, vh) => ({ start: top - vh, end: top })
    );
  });
}

/* ---------- 2. Manifesto: words light as they are read ---------- */

export function initManifesto() {
  const para = document.querySelector('[data-manifesto]');
  if (!para) return;
  const section = para.closest('.manifesto');
  const words = [...para.querySelectorAll('.word')];
  if (!words.length) return;

  if (env.reducedMotion) {
    words.forEach((w) => (w.dataset.lit = 'true'));
    return;
  }

  scroll.track(
    section,
    (p) => {
      // Finish lighting a little before the section releases, so the last
      // word is legible for a beat rather than flashing past.
      const lit = Math.round(clamp(p / 0.72) * words.length);
      for (let i = 0; i < words.length; i++) {
        const on = i < lit;
        if ((words[i].dataset.lit === 'true') !== on) words[i].dataset.lit = String(on);
      }
    },
    Scroll.pin
  );
}

/* ---------- 7. Provenance: parallax zoom ---------- */

export function initParallax() {
  document.querySelectorAll('[data-parallax]').forEach((wrap) => {
    const img = wrap.querySelector('img');
    if (!img) return;
    scroll.track(
      wrap.parentElement,
      (p) => {
        if (env.reducedMotion) {
          img.style.transform = '';
          return;
        }
        // The land drifts slower than the type and settles as it arrives.
        img.style.transform = `translate3d(0, ${(p - 0.5) * 12}%, 0) scale(${lerp(1.12, 1.0, p)})`;
      },
      Scroll.enterLeave
    );
  });
}

/* ---------- Nav state and scroll progress ---------- */

export function initChrome() {
  const nav = document.getElementById('nav');
  const progress = document.getElementById('progress');
  const hero = document.getElementById('top');
  const heroHeight = () => (hero ? hero.offsetHeight * 0.72 : window.innerHeight * 0.7);

  scroll.onUpdate((s) => {
    const past = s.current > heroHeight();
    if (nav) nav.dataset.stuck = String(past);
    if (progress) {
      progress.dataset.visible = String(past && s.progress < 0.985);
      progress.style.setProperty('--p', s.progress.toFixed(4));
    }
  });
}

/* ---------- Anchor links routed through the scroll engine ---------- */

export function initAnchors() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    scroll.to(el, { offset: id === '#top' ? 0 : -Number(getComputedStyle(document.documentElement).getPropertyValue('--nav-h').replace('px', '') || 68) });
    history.replaceState(null, '', id);
    // Move keyboard focus with the view so the page stays navigable.
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
