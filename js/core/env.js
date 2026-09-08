window.M["core/env.js"] = (function () {
/* ============================================================
   Environment probing, math helpers, quality tiering.
   ============================================================ */

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

const lerp = (a, b, t) => a + (b - a) * t;

/** Frame-rate independent smoothing. `t` is the per-60fps lerp factor. */
const damp = (a, b, t, dt) => lerp(a, b, 1 - Math.pow(1 - t, dt * 60));

/** Smooth 0..1 ramp, used for scene beat blending. */
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const mql = (q) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null);

const reducedMotionQuery = mql('(prefers-reduced-motion: reduce)');
const finePointerQuery = mql('(pointer: fine)');

const env = {
  get reducedMotion() {
    return !!(reducedMotionQuery && reducedMotionQuery.matches);
  },
  get finePointer() {
    return !!(finePointerQuery && finePointerQuery.matches);
  },
  get mobile() {
    return window.innerWidth < 900;
  },
  get touch() {
    return window.matchMedia('(pointer: coarse)').matches;
  },
};

/** Listen for a change in the reduced-motion preference without a reload. */
function onReducedMotionChange(fn) {
  if (!reducedMotionQuery) return;
  const handler = () => fn(reducedMotionQuery.matches);
  if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener('change', handler);
  else reducedMotionQuery.addListener(handler);
}

/**
 * Quality tier for the WebGL scene.
 * `high`   full transmission glass, full particle count
 * `medium` transmission off, reduced segments
 * `low`    static single frame, minimal geometry
 */
function qualityTier() {
  if (env.reducedMotion) return 'low';

  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const small = window.innerWidth < 768;

  if (mem <= 2 || cores <= 2) return 'low';
  if (small || env.touch || mem <= 4 || cores <= 4) return 'medium';
  return 'high';
}

/** WebGL2 or WebGL1 availability. Returns false on blocked or software contexts. */
function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch (e) {
    return false;
  }
}

/** Wait for the webfonts so canvas-drawn label textures use the right face. */
function fontsReady() {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();
  return document.fonts.ready.catch(() => {});
}

return { clamp, lerp, damp, smoothstep, env, onReducedMotionChange, qualityTier, supportsWebGL, fontsReady };
})();
