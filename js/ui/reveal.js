/* ============================================================
   Entrance reveals and word splitting.
   IntersectionObserver only. No scroll handlers.
   ============================================================ */

import { env } from '../core/env.js';

/**
 * Wrap every word in `<span class="word"><i>word</i></span>` while
 * preserving inline markup such as <em>. Whitespace is left alone so
 * the text still copies and reads correctly.
 */
export function splitWords(el) {
  if (el.dataset.split === 'true') return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim()) textNodes.push(node);
  }

  for (const text of textNodes) {
    const frag = document.createDocumentFragment();
    const parts = node_split(text.nodeValue);
    for (const part of parts) {
      if (!part.trim()) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const word = document.createElement('span');
      word.className = 'word';
      const inner = document.createElement('i');
      inner.textContent = part;
      word.appendChild(inner);
      frag.appendChild(word);
    }
    text.parentNode.replaceChild(frag, text);
  }

  const words = el.querySelectorAll('.word');
  words.forEach((w, i) => w.style.setProperty('--delay', `${i * 55}ms`));
  el.dataset.split = 'true';
  return words;
}

function node_split(value) {
  return value.split(/(\s+)/);
}

/** Observe everything marked for reveal and flip it once, on entry. */
export function initReveals() {
  document.querySelectorAll('[data-words]').forEach(splitWords);

  const targets = document.querySelectorAll('[data-reveal], [data-reveal-media]');

  if (env.reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach(setIn);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        setIn(entry.target);
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );

  targets.forEach((el) => io.observe(el));
}

function setIn(el) {
  if (el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'in');
  if (el.hasAttribute('data-reveal-media')) el.setAttribute('data-reveal-media', 'in');
}

/** Reveal immediately, used for anything already in view when the gate lifts. */
export function revealAboveFold() {
  const vh = window.innerHeight;
  document.querySelectorAll('[data-reveal], [data-reveal-media]').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh * 0.92 && rect.bottom > 0) setIn(el);
  });
}
