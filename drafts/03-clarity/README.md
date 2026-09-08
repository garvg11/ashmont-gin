# Ashmont — direction 03, "Clarity"

A third parallel direction for the Ashmont Gin concept site. Cold daylight seen
through water: the hero is submerged, the page surfaces, and the bottle travels
to the second section and no further.

Draft 02 (navy night, Bodoni, gold) lives at the repository root and is not
touched by anything here. `DESIGN.md` is the source of truth for this draft — if
a visual decision changes, change that file first.

## Run it

```bash
node serve.js 5178
```

Serves this folder on `http://localhost:5178`, and prints a LAN address so you
can open it on a phone on the same Wi-Fi. There is no build step: plain HTML,
native CSS custom properties, ES modules, self-hosted fonts.

## What is where

```
index.html            one page, seven sections
css/
  tokens.css          palette, type scale, easing, rhythm
  base.css            reset, typography, layout primitives, a11y
  components.css      preloader, cursor, stage, nav, drawer, buttons, form, footer
  sections.css        one block per section, then the responsive collapse
js/
  main.js             boot order, the two scroll triggers, the hero entrance
  core/env.js         capability probing, quality tiering, math helpers
  core/smooth.js      Lenis + GSAP ticker + ScrollTrigger wiring
  scene/scene.js      renderer, camera poses, the handoff, disposal
  scene/water.js      ripple simulation and the caustic shader
  scene/bottle.js     the bottle, built from a lathe profile and canvas artwork
  ui/boot.js          preloader progress and the curtain wipe
  ui/reveal.js        line splitter and the three reveal primitives
  ui/interactions.js  cursor, magnetics, nav, drawer, form
vendor/               three, gsap, ScrollTrigger, lenis — pinned, no package manager
assets/fonts/         Fraunces, Instrument Sans, IBM Plex Mono (latin + latin-ext)
```

## Tuning

The scene is procedural on purpose, so its numbers stay editable. With the page
open, `window.ashmont.progress` reports the live pose, drain and camera state,
and `window.ashmont.scene` exposes `setPose`, `setDrain` and `push` for poking at
it from the console.

Camera framing lives in `POSE` at the top of `js/scene/scene.js` — two objects
for landscape, two for portrait. The bottle's proportions live in `PROFILE` at
the top of `js/scene/bottle.js`.

## Notes

- Ashmont is a fictional brand built as a design concept.
- Fonts are self-hosted subsets generated from Google Fonts (SIL Open Font
  License). `three`, `gsap`, `ScrollTrigger` and `lenis` are vendored at pinned
  versions rather than installed, to keep the zero-build convention.
