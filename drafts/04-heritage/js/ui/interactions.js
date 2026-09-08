window.M["ui/interactions.js"] = (function () {
/* ============================================================
   Micro-interactions.

   Rules of the house:
   - Nothing runs on a scroll listener. ScrollTrigger owns scroll.
   - Every pointer effect is behind `pointer: fine`, because a
     magnetic button on a touch screen is a button that misses.
   - No custom cursor. The comp does not have one and it costs
     keyboard and pointer users more than it returns.
   ============================================================ */

const { gsap, ScrollTrigger } = window;

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

  /* The bar carries a scrim over photography and a blurred ground over
     the light sections. It flips at the first light section rather than
     at a scroll number, so it can never be light-on-light. */
  ScrollTrigger.create({
    trigger: '#product',
    start: 'top 72px',
    endTrigger: '#house',
    end: 'top 72px',
    onToggle: (self) => {
      nav.classList.toggle('on-dark', !self.isActive);
      nav.dataset.solid = String(self.isActive);
    },
  });

  /* Hide going down, show coming back, never over the hero. */
  let last = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const overHero = y < hero.offsetHeight * 0.6;
      nav.dataset.hidden = String(!overHero && y > last && y > 320);
      last = y;
    },
  });

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

/* ---------- Drag to rotate ----------
   Only live while the product section owns the screen, so a drag in
   the hero still scrolls the page the way a reader expects. */
function initDrag({ scene, stage }) {
  if (!scene) return;
  let down = false;
  let lastX = 0;

  const start = (x) => { down = true; lastX = x; };
  const move  = (x) => {
    if (!down) return;
    scene.addSpin((x - lastX) * 0.008);
    lastX = x;
  };
  const end = () => { down = false; };

  stage.addEventListener('pointerdown', (e) => { start(e.clientX); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', (e) => move(e.clientX));
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  /* Keyboard parity: the bottle is decorative, but if a reader tabs to
     the hint they can still turn it. */
  const hint = document.getElementById('grab-hint');
  if (hint) {
    hint.tabIndex = 0;
    hint.setAttribute('role', 'button');
    hint.setAttribute('aria-label', 'Rotate the bottle. Use the left and right arrow keys.');
    hint.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  { scene.addSpin(-0.35); e.preventDefault(); }
      if (e.key === 'ArrowRight') { scene.addSpin(0.35);  e.preventDefault(); }
    });
  }
}

/* ---------- Signup ----------
   No backend. It validates honestly and says so rather than
   pretending to submit. */
function initForm() {
  const form = document.getElementById('join-form');
  if (!form) return;
  const msg = document.getElementById('join-msg');
  const email = form.querySelector('#email');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    email.removeAttribute('aria-invalid');

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.value.trim())) {
      email.setAttribute('aria-invalid', 'true');
      msg.textContent = 'That email address does not look right.';
      email.focus();
      return;
    }
    msg.textContent = 'Ashmont is a design concept, so there is nothing to send. The form validates, though.';
    form.querySelector('button').disabled = true;
  });
}

return { initMagnetic, initNav, initDrag, initForm };
})();
