# Ashmont — direction 04, "Heritage"

A build of the supplied comp (`Ashmont Mocks.pdf`) at close to full fidelity:
navy, gold and cream, high-contrast Didone display, full-bleed photography, and
the procedural bottle carried over from draft 03.

`DESIGN.md` is the source of truth, including a section recording exactly where
this departs from the comp and why.

## Run it

Double-click `index.html`. No server needed: this draft follows the repository's
classic-script convention, so it works from `file://`.

For a local server (and a LAN address for phone testing):

```bash
node serve.js 5182
```

## What is where

```
index.html            one page, nine sections
css/
  tokens.css          palette, type scale, easing, rhythm
  base.css            reset, typography, layout primitives, a11y
  components.css      loader, stage, nav, drawer, links, media, form, footer
  sections.css        one block per section, then the responsive collapse
js/
  main.js             boot order, the two scroll ranges, the hero entrance
  core/env.js         capability probing, quality tiering, math helpers
  core/smooth.js      Lenis + GSAP ticker + ScrollTrigger wiring
  scene/scene.js      camera poses, the two render passes, disposal
  scene/water.js      ripple simulation and the plate-displacement shader
  scene/bottle.js     the bottle, lathe profile plus canvas label artwork
  ui/boot.js          loader progress and the curtain wipe
  ui/reveal.js        line splitter and the four reveal primitives
  ui/interactions.js  magnetics, nav, drawer, drag to rotate, form
vendor/               three, gsap, ScrollTrigger, lenis, pinned, no package manager
assets/fonts/         Playfair Display, Jost (latin + latin-ext, 176 KB total)
assets/img/           nine graded plates, three widths each, WebP
```

## Photography

Sourced from [Unsplash](https://unsplash.com) (free for commercial use, no
attribution required) and graded into the brand at build time. Photo IDs, so the
set can be re-fetched:

| Slot | Unsplash ID |
|---|---|
| Hero water | `3o5oUjrD90w` |
| Our world | `7Q_hSgy0Taw` |
| Marble | `LfU6_b3Oj4E` |
| Juniper | `luHts9dzld8` |
| Forest | `_z4RGVKKuds` |
| Copper still | `KqOHcCwt7TQ` |
| Martini | `E0ylYi5fGaU` |
| House serve | `jItXeBE_Ps4` |

Fetch one with `https://unsplash.com/photos/<id>/download?w=2400`. The grade is
described in `DESIGN.md` section 5.

## Tuning

With the page open, `window.ashmont.state` reports the live pose, drag and camera
values. `window.ashmont.scene` exposes `setPose`, `addSpin` and `push`, and
`window.ashmont.smooth` is the Lenis instance.

Camera framing lives in `POSE` at the top of `js/scene/scene.js`, two objects for
landscape and two for portrait. Bottle proportions live in `PROFILE` at the top
of `js/scene/bottle.js`. The image grade lives in the pipeline documented in
`DESIGN.md`.

## Notes

- Ashmont is a fictional brand built as a design concept. The awards shown are
  invented and drawn as typographic marks rather than reproduced seals.
- Fonts are self-hosted subsets from Google Fonts (SIL Open Font License).
- Icons are [Phosphor](https://phosphoricons.com) (MIT), inlined as a sprite so
  there is no runtime icon dependency.
- `three`, `gsap`, `ScrollTrigger` and `lenis` are vendored at pinned versions
  rather than installed, to keep the zero-build convention.
