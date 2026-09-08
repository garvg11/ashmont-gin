window.M["ui/interactions.js"] = (function () {
/* ============================================================
   Micro-interactions. Everything here is tactile feedback, which is
   the one job motion is allowed to do without asking permission.
   ============================================================ */

const { onFrame } = window.M["core/raf.js"];
const { damp, env, clamp } = window.M["core/env.js"];

/* ---------- Cursor ----------
   Requested in the brief. Gated to fine pointers, disabled entirely
   under reduced motion, and the native caret is restored over inputs
   so text selection never feels broken.
   ---------------------------------------------------------------- */

function initCursor() {
  const root = document.querySelector('.cursor');
  if (!root || !env.finePointer || env.reducedMotion) return;

  const dot = root.querySelector('.cursor__dot');
  const ring = root.querySelector('.cursor__ring');
  document.documentElement.dataset.cursor = 'custom';

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let dx = mx;
  let dy = my;
  let rx = mx;
  let ry = my;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX;
      my = e.clientY;
    },
    { passive: true }
  );

  document.addEventListener('pointerleave', () => (root.style.opacity = '0'));
  document.addEventListener('pointerenter', () => (root.style.opacity = '1'));

  const interactive = 'a, button, [data-serve] .serve__head, .stockist, input, label';
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest && e.target.closest(interactive)) root.dataset.active = 'true';
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest && e.target.closest(interactive)) root.dataset.active = 'false';
  });

  onFrame((dt) => {
    dx = damp(dx, mx, 0.55, dt);
    dy = damp(dy, my, 0.55, dt);
    rx = damp(rx, mx, 0.16, dt);
    ry = damp(ry, my, 0.16, dt);
    dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
  });
}

/* ---------- Magnetic buttons + directional fill ---------- */

function initMagnetic() {
  if (!env.finePointer || env.reducedMotion) return;

  const active = new Map();

  const attach = (el, strength, radius) => {
    el.addEventListener('pointerenter', (e) => {
      const r = el.getBoundingClientRect();
      // The fill wipes in from the edge the pointer actually crossed.
      el.style.setProperty('--wipe-x', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--wipe-y', `${((e.clientY - r.top) / r.height) * 100}%`);
      active.set(el, active.get(el) || { x: 0, y: 0, tx: 0, ty: 0, strength });
    });

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      const pull = 1 - clamp(dist / radius);
      const s = active.get(el);
      if (!s) return;
      s.tx = (e.clientX - cx) * strength * pull;
      s.ty = (e.clientY - cy) * strength * pull;
    });

    el.addEventListener('pointerleave', () => {
      const s = active.get(el);
      if (s) {
        s.tx = 0;
        s.ty = 0;
        s.releasing = true;
      }
    });
  };

  document.querySelectorAll('[data-magnetic]').forEach((el) => attach(el, 0.3, 90));
  document.querySelectorAll('[data-magnetic-soft]').forEach((el) => attach(el, 0.12, 140));

  onFrame((dt) => {
    for (const [el, s] of active) {
      s.x = damp(s.x, s.tx, 0.18, dt);
      s.y = damp(s.y, s.ty, 0.18, dt);
      if (s.releasing && Math.abs(s.x) < 0.05 && Math.abs(s.y) < 0.05) {
        el.style.transform = '';
        active.delete(el);
        continue;
      }
      el.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
    }
  });
}

/* ---------- Navigation drawer ---------- */

function initNav() {
  const btn = document.getElementById('menu-btn');
  const drawer = document.getElementById('drawer');
  if (!btn || !drawer) return;

  const setOpen = (open) => {
    drawer.dataset.open = String(open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.dataset.locked = open ? 'true' : 'false';
    if (open) drawer.querySelector('a').focus({ preventScroll: true });
  };

  btn.addEventListener('click', () => setOpen(drawer.dataset.open !== 'true'));
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.dataset.open === 'true') {
      setOpen(false);
      btn.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && drawer.dataset.open === 'true') setOpen(false);
  });
}

/* ---------- Theme ---------- */

function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const current = () => {
    const set = document.documentElement.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  const apply = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    btn.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance'
    );
    try {
      localStorage.setItem('ashmont-theme', theme);
    } catch (e) {}
    // The 3D scene repaints its fog, ground and lights to match.
    window.dispatchEvent(new CustomEvent('ashmont:theme', { detail: { theme } }));
  };

  apply(current());
  btn.addEventListener('click', () => apply(current() === 'dark' ? 'light' : 'dark'));
}

/* ---------- Serves accordion ---------- */

function initAccordion() {
  const group = document.querySelector('[data-accordion]');
  if (!group) return;
  const items = [...group.querySelectorAll('[data-serve]')];

  const open = (item) => {
    for (const other of items) {
      const isTarget = other === item;
      other.dataset.open = String(isTarget);
      const head = other.querySelector('.serve__head');
      if (head) head.setAttribute('aria-expanded', String(isTarget));
    }
  };

  items.forEach((item) => {
    const head = item.querySelector('.serve__head');
    head.addEventListener('click', () => {
      // One open at a time. Closing the last one leaves an empty section,
      // so the active item stays open when clicked again.
      open(item);
    });
    // Pointer preview on desktop, click on touch.
    if (env.finePointer) {
      item.addEventListener('pointerenter', () => open(item));
    }
  });
}

/* ---------- Newsletter form ---------- */

function initForm() {
  const form = document.getElementById('drop-form');
  if (!form) return;

  const field = document.getElementById('field-email');
  const input = document.getElementById('email');
  const error = document.getElementById('email-error');
  const status = document.getElementById('form-status');
  const btn = form.querySelector('button[type="submit"]');
  const label = btn.querySelector('.btn__label');
  const original = label.textContent;

  const valid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

  const setError = (msg) => {
    field.dataset.invalid = msg ? 'true' : 'false';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    error.textContent = msg || '';
  };

  input.addEventListener('input', () => {
    if (field.dataset.invalid === 'true' && valid(input.value)) setError('');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valid(input.value)) {
      setError('Enter an email address we can actually reach.');
      input.focus();
      return;
    }
    setError('');
    btn.dataset.state = 'loading';
    label.textContent = 'Sending';
    status.textContent = '';

    try {
      // No endpoint is wired up in this build. Point this at your ESP.
      await new Promise((r) => setTimeout(r, 900));
      form.reset();
      status.textContent = 'You are on the list. We will write once, when batch nineteen is bottled.';
    } catch (err) {
      status.textContent = 'That did not send. Try again, or write to hello@ashmontgin.com.';
    } finally {
      btn.dataset.state = '';
      label.textContent = original;
    }
  });
}

return { initCursor, initMagnetic, initNav, initTheme, initAccordion, initForm };
})();
