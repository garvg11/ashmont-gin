/* ============================================================
   One requestAnimationFrame loop for the whole page.
   Everything that animates subscribes here. Nothing else calls rAF.
   ============================================================ */

const subscribers = new Set();
let running = false;
let last = 0;
let rafId = 0;

function tick(now) {
  rafId = requestAnimationFrame(tick);
  // Delta in seconds, clamped so a backgrounded tab does not produce a jump.
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  for (const fn of subscribers) fn(dt, now);
}

function start() {
  if (running) return;
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(tick);
}

function stop() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(rafId);
}

/** Subscribe to the frame loop. Returns an unsubscribe function. */
export function onFrame(fn) {
  subscribers.add(fn);
  start();
  return () => {
    subscribers.delete(fn);
    if (!subscribers.size) stop();
  };
}

// Pause everything when the tab is hidden. No work, no battery drain.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else if (subscribers.size) start();
});
