window.M["ui/interactions.js"] = (function () {
/* ============================================================
   Micro-interactions.

   Rules of the house:
   - Nothing here runs on a pointermove handler that touches layout.
     Positions are written in one rAF, read from cached rects.
   - Every effect is behind `pointer: fine`, because a magnetic
     button on a touch screen is just a button that misses.
   - The hero has no cursor ring. There, the water is the cursor.
   ============================================================ */

const { gsap } = window;

/* ---------- Cursor ---------- */
function initCursor({ reducedMotion }) {
  const el = document.getElementById('cursor');
  if (!el || !window.matchMedia('(pointer: fine)').matches) return { destroy() {} };

  const dot = { x: innerWidth / 2, y: innerHeight / 2 };
  const pos = { ...dot };
  let raf = 0;

  /* Hidden until the pointer actually moves, so a fresh page does not
     open with a ring parked in the middle of the hero. */
  el.dataset.state = 'water';

  const move = (e) => {
    dot.x = e.clientX;
    dot.y = e.clientY;
    el.dataset.seen = 'true';
  };
  const tick = () => {
    const k = reducedMotion ? 1 : 0.19;
    pos.x += (dot.x - pos.x) * k;
    pos.y += (dot.y - pos.y) * k;
    el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    raf = requestAnimationFrame(tick);
  };

  const over = (e) => {
    if (el.dataset.seen !== 'true') return;
    const t = e.target;
    if (t.closest('.hero, .surface')) el.dataset.state = 'water';
    else if (t.closest('a, button, [data-magnetic]')) el.dataset.state = 'hot';
    else if (t.closest('input, textarea')) el.dataset.state = 'text';
    else el.dataset.state = '';
  };

  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerover', over, { passive: true });
  raf = requestAnimationFrame(tick);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', move);
      removeEventListener('pointerover', over);
    },
  };
}

/* ---------- Magnetic controls ----------
   Eight pixels maximum. Past that it stops reading as weight and
   starts reading as a control running away from the pointer. */
function initMagnetic({ reducedMotion }) {
  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    let rect = null;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });

    el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const pull = Math.min(d / 90, 1) * 8;
      xTo((dx / d) * pull);
      yTo((dy / d) * pull);
    });
    el.addEventListener('pointerleave', () => { rect = null; xTo(0); yTo(0); });
  });
}

/* ---------- Navigation ---------- */
function initNav({ smooth }) {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const hero = document.querySelector('.hero');
  const surface = document.querySelector('.surface');

  /* The nav starts on deep water with the scene behind it and flips at
     exactly the moment the drain finishes, which is the same anchor the
     scene uses. Any other point leaves a dark scrim over daylight. */
  const { ScrollTrigger } = window;
  ScrollTrigger.create({
    trigger: surface,
    start: 'bottom bottom',
    onEnter: () => { nav.classList.remove('on-deep'); nav.dataset.solid = 'true'; },
    onLeaveBack: () => { nav.classList.add('on-deep'); nav.dataset.solid = 'false'; },
  });

  /* Hide on the way down, show on the way up, but never over the hero. */
  let last = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const overHero = y < hero.offsetHeight * 0.6;
      nav.dataset.hidden = String(!overHero && y > last && y > 300);
      last = y;
    },
  });

  /* Drawer */
  const setDrawer = (open) => {
    drawer.dataset.open = String(open);
    burger.setAttribute('aria-expanded', String(open));
    if (open) drawer.removeAttribute('inert'); else drawer.setAttribute('inert', '');
    document.body.style.overflow = open ? 'hidden' : '';
    if (smooth.lenis) open ? smooth.stop() : smooth.start();
  };
  burger?.addEventListener('click', () => setDrawer(drawer.dataset.open !== 'true'));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.dataset.open === 'true') { setDrawer(false); burger.focus(); }
  });

  /* Anchors go through Lenis so smooth scroll and native jumps agree. */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (drawer.dataset.open === 'true') setDrawer(false);
      smooth.scrollTo(target, { offset: 0 });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}

/* ---------- Stockist form ----------
   No backend. It validates honestly and says so, rather than
   pretending to submit. */
function initForm() {
  const form = document.getElementById('find-form');
  if (!form) return;
  const msg = document.getElementById('find-msg');
  const loc = form.querySelector('#loc');
  const email = form.querySelector('#email');

  const fail = (field, text) => {
    field.setAttribute('aria-invalid', 'true');
    msg.dataset.error = 'true';
    msg.textContent = text;
    field.focus();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    [loc, email].forEach((f) => f.removeAttribute('aria-invalid'));
    msg.dataset.error = 'false';

    if (!loc.value.trim()) return fail(loc, 'Tell us a town or a postcode.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.value.trim())) {
      return fail(email, 'That email address does not look right.');
    }

    msg.textContent = 'Ashmont is a design concept, so there is nothing to send. The form validates, though.';
    form.querySelector('button').disabled = true;
  });
}

return { initCursor, initMagnetic, initNav, initForm };
})();
