/* ============================================================
   Reveals.

   Three primitives, and every animated element on the page uses one
   of them:

     [data-split]   display type, revealed a line at a time
     [data-reveal]  a single block rising into place
     [data-stagger] a list whose children arrive in sequence

   Lines are measured, not guessed. Words are wrapped, their offsets
   read once, then grouped, so a reflow at any width still breaks in
   the right places.
   ============================================================ */

const { gsap, ScrollTrigger } = window;

/** Split an element into `.line > span` groups without losing markup. */
function splitLines(el) {
  const units = [];
  const frag = document.createDocumentFragment();

  const pushWords = (text) => {
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      if (part === '') continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(' '));
        continue;
      }
      const s = document.createElement('span');
      s.className = 'word';
      s.textContent = part;
      frag.appendChild(s);
      units.push({ el: s });
    }
  };

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      pushWords(node.textContent);
    } else if (node.nodeName === 'BR') {
      units.push({ br: true });
      frag.appendChild(document.createElement('wbr'));
    } else {
      /* Anything that is already an element travels as one unit, so
         inline marks and the hero's full stop survive the split. */
      frag.appendChild(node);
      units.push({ el: node });
    }
  }

  el.textContent = '';
  el.appendChild(frag);

  /* Group by vertical offset, with explicit breaks honoured. */
  const lines = [];
  let current = [];
  let lastTop = null;

  for (const u of units) {
    if (u.br) {
      if (current.length) lines.push(current);
      current = [];
      lastTop = null;
      continue;
    }
    /* Only wrapped words start a new line. An inline mark sitting on
       the baseline has its own offsetTop and would otherwise be read
       as a line of its own, which is how the hero's full stop ended
       up under the headline instead of after it. */
    if (u.el.classList.contains('word')) {
      const top = u.el.offsetTop;
      if (lastTop !== null && Math.abs(top - lastTop) > 2) {
        lines.push(current);
        current = [];
      }
      lastTop = top;
    }
    current.push(u.el);
  }
  if (current.length) lines.push(current);

  /* Rebuild: one masked line box per measured line. */
  el.textContent = '';
  const inners = [];
  for (const line of lines) {
    const outer = document.createElement('span');
    outer.className = 'line';
    const inner = document.createElement('span');
    line.forEach((node, i) => {
      /* Words are re-spaced. Inline marks stay welded to what they follow. */
      if (i > 0 && node.classList.contains('word')) {
        inner.appendChild(document.createTextNode(' '));
      }
      inner.appendChild(node);
    });
    outer.appendChild(inner);
    el.appendChild(outer);
    inners.push(inner);
  }

  return inners;
}

export function initReveals({ reducedMotion = false } = {}) {
  if (reducedMotion) {
    gsap.set('[data-reveal], [data-stagger] > *', { opacity: 1, y: 0 });
    /* Same shape as the animated path. Returning a different one here
       is how the reduced-motion path used to throw and take the whole
       page down with it. */
    return { hero: { lines: [], blocks: [] }, refresh() {} };
  }

  /* The hero is the one thing that does not animate on scroll. It runs
     off the entrance timeline, so its elements are prepared here and
     handed back for main.js to play. */
  const hero = { lines: [], blocks: [] };
  const inHero = (el) => !!el.closest('.hero');

  /* ---------- Display type ---------- */
  document.querySelectorAll('[data-split]').forEach((el) => {
    const inners = splitLines(el);
    gsap.set(inners, { yPercent: 112, opacity: 0 });

    if (inHero(el)) {
      hero.lines.push(...inners);
      return;
    }

    ScrollTrigger.create({
      trigger: el,
      start: 'top 86%',
      once: true,
      onEnter: () => {
        gsap.to(inners, {
          yPercent: 0,
          opacity: 1,
          duration: 1.05,
          ease: 'expo.out',
          stagger: 0.075,
        });
      },
    });
  });

  /* ---------- Blocks ---------- */
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const delay = parseFloat(el.dataset.delay || '0');
    gsap.set(el, { opacity: 0, y: 22 });

    if (inHero(el)) {
      hero.blocks.push({ el, delay });
      return;
    }

    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'expo.out',
          delay: Math.min(delay, 0.35),
        });
      },
    });
  });

  /* ---------- Lists ---------- */
  document.querySelectorAll('[data-stagger]').forEach((list) => {
    const items = Array.from(list.children);
    gsap.set(items, { opacity: 0, y: 26 });

    ScrollTrigger.create({
      trigger: list,
      start: 'top 84%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: 'expo.out',
          stagger: 0.055,
        });
      },
    });
  });

  /* ---------- Parallax ----------
     One element, one axis. The provenance field is oversized top and
     bottom precisely so it has somewhere to travel. */
  const field = document.querySelector('.provenance__field');
  if (field) {
    gsap.fromTo(field, { yPercent: -7 }, {
      yPercent: 7,
      ease: 'none',
      scrollTrigger: {
        trigger: '.provenance',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  return {
    hero,
    refresh() { ScrollTrigger.refresh(); },
  };
}
