/* ============================================================
   Preloader and age gate.

   The gate is a legal requirement for a spirits site and it is also
   the first design moment: restraint, then being let in.
   ============================================================ */

import { onFrame } from '../core/raf.js';
import { damp, clamp, env } from '../core/env.js';

const AGE_KEY = 'ashmont-age-ok';

function stored(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export function createBoot() {
  const el = document.getElementById('preloader');
  const bar = document.getElementById('pre-bar');
  const count = document.getElementById('pre-count');
  const gate = document.getElementById('age-gate');

  let target = 0;
  let value = 0;
  let stopFrame = null;
  let entered = false;

  document.body.dataset.locked = 'true';

  if (el) {
    stopFrame = onFrame((dt) => {
      value = damp(value, target, 0.12, dt);
      if (bar) bar.style.setProperty('--p', value.toFixed(3));
      if (count) count.textContent = String(Math.round(value * 100)).padStart(3, '0');
    });
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const askAge = () =>
    new Promise((resolve) => {
      if (stored(AGE_KEY) === 'true' || !gate) return resolve();

      gate.hidden = false;
      requestAnimationFrame(() => (gate.dataset.open = 'true'));

      const yes = document.getElementById('gate-yes');
      const no = document.getElementById('gate-no');
      yes.focus({ preventScroll: true });

      yes.addEventListener('click', () => {
        try {
          localStorage.setItem(AGE_KEY, 'true');
        } catch (e) {}
        gate.dataset.open = 'false';
        setTimeout(() => {
          gate.hidden = true;
          resolve();
        }, 500);
      });

      no.addEventListener('click', () => {
        gate.dataset.refused = 'true';
        // Deliberately no resolve. Someone under age does not get in.
      });
    });

  return {
    /** 0..1 progress from real load signals. */
    progress(v) {
      target = Math.max(target, clamp(v));
    },

    /** Finish the counter, ask for age, then lift the curtain. */
    async enter() {
      if (entered) return;
      entered = true;
      target = 1;
      if (document.hidden) {
        // A background tab throttles rAF to about 1fps, so the counter
        // would crawl. Land it immediately and skip the flourish.
        value = 1;
        if (bar) bar.style.setProperty('--p', '1');
        if (count) count.textContent = '100';
      } else {
        // Let the counter actually land on 100 rather than snapping.
        await wait(env.reducedMotion ? 0 : 420);
      }

      await askAge();

      if (el) {
        el.dataset.done = 'true';
        el.setAttribute('aria-hidden', 'true');
      }
      document.body.dataset.locked = 'false';
      window.scrollTo(0, 0);

      await wait(env.reducedMotion ? 0 : 620);
      if (stopFrame) stopFrame();
      if (el) el.style.display = 'none';
      document.dispatchEvent(new CustomEvent('ashmont:entered'));
    },
  };
}
