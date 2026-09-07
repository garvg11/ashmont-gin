# Ashmont Gin - Design System

The single source of truth for the site. Every visual decision below is deliberate and locked.
If a change conflicts with this file, change this file first.

---

## 1. The Read

**Premium-consumer brand site (craft spirits)** for design-conscious drinkers and on-trade buyers.
Language: **cold luxury, cinematic, maritime night**. Not warm-craft, not artisan-beige.

Dials: `DESIGN_VARIANCE 7` · `MOTION_INTENSITY 7` · `VISUAL_DENSITY 3`

**The story in one line:** Ashmont is distilled from cold. Everything on the page is the temperature
of the bottle: blue glass, black water, sea fog, and a single point of light passing through.

**The emotional arc:**

| Beat | Section | Feeling |
|---|---|---|
| Threshold | Age gate + preloader | Restraint. Being let in. |
| Arrival | Hero | Awe. The object exists in real space. |
| Belief | Manifesto | Conviction. Someone decided this. |
| Curiosity | Botanicals | Discovery. Seven specific things. |
| Trust | Distillation | Competence. This is made, not branded. |
| Desire | The bottle | Want. Close enough to touch. |
| Permission | Serves | "I could make that tonight." |
| Origin | Provenance | Place. It comes from somewhere real. |
| Action | Find a bottle | Decision. |

---

## 2. Color

One accent, locked across the whole page: **Sapphire**. No brass, no gold, no warm neutrals.
This is the "Cobalt + Cream" family, deliberately chosen over the default artisan beige/brass palette.

### Dark (brand default)

| Token | Value | Use |
|---|---|---|
| `--ink-950` | `#04080F` | Page ground. Off-black blue, never `#000`. |
| `--ink-900` | `#070D18` | Section ground |
| `--ink-850` | `#0A1220` | Raised surface |
| `--ink-800` | `#0E1829` | Hairlines, inset fills |
| `--sapphire` | `#2554D8` | The accent. Glass, CTA, focus ring. |
| `--sapphire-lit` | `#6E9BFF` | Highlights, glass edge light, hover |
| `--sapphire-deep` | `#0B2A6B` | Glass attenuation, gradient floor |
| `--bone` | `#E6E9F0` | Primary text. Cool off-white, never `#fff`. |
| `--mist` | `#8F9AAF` | Secondary text |
| `--mist-dim` | `#5C6779` | Tertiary, captions, disabled |

### Light (`prefers-color-scheme: light` + manual toggle)

Same accent, re-weighted for contrast. The site does not become a different brand.

| Token | Value |
|---|---|
| `--ink-950` | `#EEF0F5` (ground) |
| `--ink-900` | `#F5F6F9` |
| `--ink-850` | `#FFFFFF` |
| `--sapphire` | `#1E45B8` (darkened for AA on light) |
| `--bone` | `#0A1220` (text inverts) |
| `--mist` | `#4A5468` |

**Contrast floors:** body text AA 4.5:1, display AAA where possible. Every CTA audited.

---

## 3. Type

| Role | Family | Why |
|---|---|---|
| Display | **Bodoni Moda** (variable, `opsz` 6-96) | A Didone. Engraved spirits-label tradition, hairline contrast that reads as cold and precise. Not Fraunces, not Instrument Serif. |
| Text | **Archivo** (variable 300-700) | Neo-grotesque. Sturdy, quiet, gets out of the serif's way. Not Inter. |
| Data | **IBM Plex Mono** (400/500) | Used only for real measured values (ABV, volume, temperature). Never decorative. |

Rules:
- Emphasis inside a display headline uses **Bodoni Moda italic**, same family. Never a mixed-family word swap.
- Italic words containing descenders (`y g j p q`) get `line-height: 1.12` minimum plus bottom reserve.
- Display `opsz` is driven up at large sizes so hairlines stay crisp.
- Body measure caps at `62ch`.
- Fluid scale via `clamp()`, anchored to a 1440px design width.

Scale tokens: `--fs-display` / `--fs-h1` / `--fs-h2` / `--fs-h3` / `--fs-lead` / `--fs-body` / `--fs-small` / `--fs-micro`.

---

## 4. Shape, Material, Depth

**Shape lock: sharp.** `--radius: 2px` on every surface, control, media frame, and input.
There are no pills and no rounded cards. The only circles on the page are the cursor and the
scroll-progress mark. A Didone wordmark does not sit on a 16px-rounded card.

**Depth is built from four layers, never from drop shadows:**

1. **Ground** - the dark blue base, with a faint radial vignette anchored bottom-center.
2. **Atmosphere** - the WebGL fog and particle field, fixed behind all content.
3. **Content** - type and media, moving at scroll speed.
4. **Grain** - a fixed, `pointer-events: none` noise overlay at 3.5% opacity, GPU-cheap because it never scrolls.

Shadows, when used at all, are tinted to the ground (`rgb(4 8 15 / .55)`), never pure black.
Elevation is communicated by **hairline + space**, not by boxes. Cards appear only where a real
tap target exists.

**Photography treatment (locked):** every photograph is duotone-mapped into the brand.
`filter: grayscale(1) contrast(1.08)` under a sapphire multiply layer and a lifted-black screen layer.
This is what makes stock photography read as one commissioned shoot.

---

## 5. The 3D Scene

One persistent WebGL scene, fixed behind the document, driven by a single scroll timeline.
It is not a background loop. It is a camera move through one continuous space.

**Subject:** the Ashmont bottle. Lathe-turned profile geometry, physically-based blue glass
(`transmission`, `ior 1.5`, `thickness`, sapphire `attenuationColor`), a separate interior liquid
volume, a blued-steel collar, and a canvas-drawn engraved label.

**Environment:** a procedurally generated equirectangular gradient run through `PMREMGenerator`.
Two bright softbox bands provide the specular streaks that make glass legible. No HDR download.

**Light:** cold key from upper-left, sapphire rim from behind-right to separate the bottle from the
fog, and a low fill so the punt does not crush to black.

**Camera timeline (scroll-driven):**

| Progress | Beat | Move |
|---|---|---|
| 0.00 | Hero | 3/4 view, full bottle, slow idle drift |
| 0.18 | Manifesto | Dolly in, bottle drifts left, fog thickens |
| 0.34 | Botanicals | Bottle recedes, botanical motes drift forward |
| 0.52 | Distillation | Bottle re-forms, cold light sweeps vertically |
| 0.70 | The bottle | Macro on shoulder and label, shallow framing |
| 0.85 | Provenance | Scene dissolves to fog, canvas opacity to 0 |

**Cursor:** damped parallax on camera yaw/pitch, max 3 degrees. It should feel like the object has
weight, not like it is glued to the pointer.

**Quality tiers:** transmission and the full particle count on desktop; a cheaper refraction-free
glass, reduced segments, and half the motes on mobile and low-memory devices. DPR capped at 2 (1.5 mobile).
Under `prefers-reduced-motion` the scene renders one static frame and stops.

---

## 6. Motion

Bespoke engine. One passive scroll listener stores a number; **all** animation work happens in a
single `requestAnimationFrame` loop reading cached rects. No per-frame scroll handlers, no layout
reads during animation.

**Easing:**

| Token | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | Entrances, reveals |
| `--ease-inout` | `cubic-bezier(.65,.05,.36,1)` | Transitions between states |
| `--ease-soft` | `cubic-bezier(.4,.14,.3,1)` | Hover, small UI |
| smoothing | `lerp` factor `.085` | Smooth scroll and camera damping |

**Durations:** micro 160ms · UI 320ms · reveal 720ms · scene transition 1200ms.

**Every animation must answer "what does this communicate?"** Reveals communicate hierarchy.
The horizontal pan communicates that the botanicals are a sequence. The sticky stack communicates
that distillation is ordered steps. Nothing loops infinitely except the fog, which is atmosphere.

`prefers-reduced-motion: reduce` collapses smooth scroll to native, freezes the 3D scene on one
frame, removes parallax and pinning, and turns reveals into instant opacity.

---

## 7. Micro-interactions

| Element | Behavior |
|---|---|
| Cursor | 8px dot + 34px lagging ring, `pointer: fine` only. Ring scales to 60px and inverts over interactive elements. Native cursor restored over text inputs. |
| Buttons | Magnetic pull, max 8px translate, radius 90px, spring return. Fill wipes in from the cursor's actual entry side. |
| Links | Underline draws left to right, 1px, accent colored. |
| Media | Clip-path reveal from bottom, 900ms, paired with a 1.08 to 1.0 inner scale so the image settles rather than slides. |
| Nav | Hairline appears only after the hero, background blurs in at the same moment. |
| Preloader | Real asset progress, monospace counter, then a vertical curtain wipe that hands off to the hero entrance. |
| Focus | 2px sapphire ring at 2px offset, visible on every interactive element, never removed. |

---

## 8. Layout

Grid: 12 columns, `max-width: 1440px`, gutter `clamp(20px, 4vw, 64px)`.
Section rhythm: `clamp(120px, 16vh, 200px)` vertical.

**Layout families, each used once** (no two sections share a family):

1. Scroll-pinned 3D hero
2. Full-width kinetic manifesto
3. Horizontal scroll pan (botanicals)
4. Sticky stack (distillation)
5. Asymmetric bento with real media cells (the bottle)
6. Accordion image slider (serves)
7. Full-bleed parallax zoom (provenance)
8. Split form (find a bottle)

**Mobile (`< 768px`)** collapses every asymmetric layout to a single column at `px-5`.
The horizontal pan becomes a scroll-snap carousel. The sticky stack becomes sequential cards.
The accordion becomes a vertical list. `100dvh` everywhere, never `100vh`.

---

## 9. Voice

Short. Declarative. Cold. Specific numbers only where they are real.
No "elevate", no "seamless", no "crafted with passion".
**Zero em-dashes** anywhere in the interface. Periods and commas do the work.

One CTA intent, one label: **"Find a bottle"**. It appears in the nav, the hero, and the closing
section with exactly that wording. Secondary intent is "The distillation", used once.
