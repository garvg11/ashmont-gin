# Ashmont — direction 03, "Clarity"

The source of truth for this draft. Every visual decision below is deliberate.
If a change conflicts with this file, change this file first.

This is a **parallel direction**, not a revision. Draft 02 at the repository root
(navy night, Bodoni Moda, gold, a seven-beat camera tour) stays exactly as it is.
Nothing here should be reconciled toward it, or it toward this.

---

## 1. The read

**Premium consumer brand site (craft spirits)**, for design-conscious drinkers and
on-trade buyers. Language: **cold daylight, submerged, editorial**.

**The story in one line:** draft 02 was *distilled from the cold*. This one is
*seen through water* — every surface is something light has passed through and
come out cleaner.

**The structural idea:** the page has **two grounds, not one theme**. The hero is
submerged: deep water, light type. Everything after the handoff has surfaced:
cold daylight, dark type. Breaking that surface is the whole narrative, and it is
literal — a waterline crosses the frame and the canvas hands off to the page.

| Beat | Section | Feeling |
|---|---|---|
| Arrival | Hero | Submerged. The object is in a lit medium. |
| Belief | Surface | Conviction. The bottle settles beside the claim. |
| Crossing | The held tail | Release. The water leaves, the page surfaces. |
| Curiosity | Botanicals | An index, not a gallery. |
| Trust | Distillation | Numbers somebody had to defend. |
| Permission | Serves | "I could make that tonight." |
| Origin | Provenance | Place. Cold, northern, specific. |
| Action | Find a bottle | Decision. |

---

## 2. Colour

Read off the reference frame, not invented. **There is no accent colour.** The
accent is light itself: CTAs are marine fill with caustic type, and the only
highlight on the page is real specular in the scene. Draft 02 owns gold; this
draft does not use it anywhere.

| Token | Value | Use |
|---|---|---|
| `--abyss` | `#071a2c` | Deepest water, hero ground, primary type on light |
| `--marine` | `#123a5e` | CTA fill, deep grounds |
| `--marine-2` | `#1b4e7a` | CTA hover |
| `--water` | `#3d6e96` | Mid water |
| `--haze` | `#a9c5dd` | Secondary type on deep, hairlines |
| `--surface` | `#e4eef7` | Page ground after the handoff. Daylight, never white. |
| `--mist` | `#f1f7fc` | Raised surface on light |
| `--caustic` | `#fbfdff` | The light. Primary type on deep. |
| `--cork` | `#c8a882` | The cap, and nowhere else. The single warm note. |

Sections opt into a ground with `.on-deep`, which flips the **type roles**
(`--ink`, `--ink-2`, `--rule`, `--accent`) rather than redefining colours, so a
component never needs to know where it sits.

**Verified contrast** (AA floor 4.5:1, measured, not assumed):

| Pair | Ratio |
|---|---|
| `--ink` on `--surface` | 15.0 |
| `--ink-2` on `--surface` | 6.2 |
| `--ink-3` on `--surface` (labels) | 4.6 |
| `--caustic` on `--abyss` | 17.3 |
| `--haze` on `--abyss` | 9.8 |
| `--caustic` on `--marine` (button) | 11.5 |

Hero copy sits on the canvas rather than on a token, so the shader darkens the
copy side to roughly a third of its brightness. Measured against that region the
blurb clears 9:1.

---

## 3. Type

| Role | Family | Why |
|---|---|---|
| Display | **Fraunces** (variable, `opsz` 9–144, `SOFT`, `WONK`) | Ball terminals and a teardrop `a`, matching the reference's Canela-adjacent letterforms. `WONK` is held at 0 — the novelty axis is not the point. Draft 02 explicitly excluded it, which leaves it free here. |
| Text | **Instrument Sans** (variable 400–700) | Wide tracking survives at label sizes. Not Archivo, which is draft 02's. |
| Data | **IBM Plex Mono** (400/500) | Real measured values only. Never decorative. |

Rules:
- Display is set at **weight 300** with `SOFT` around 30 and `opsz` driven hard
  (96 body, 144 hero) so hairlines stay crisp at scale.
- The hero's full stop is a **rotated square**, not a period. It is drawn as an
  inline element and travels with the last word through the line split.
- Labels: 12px, 500, `.2em` tracking, uppercase. The hero kicker widens to `.34em`.
- Body measure caps at `62ch`, leads at `46ch`.
- Fluid scale via `clamp()`, anchored to a 1440px design width.

---

## 4. Shape, material, depth

**Shape: soft, not sharp.** Draft 02 locked everything to a 2px radius. This one
uses `--r-sm: 4px` on surfaces and a **pill** on buttons only. That is a
deliberate opposition, not drift.

Depth is built from four layers and never from drop shadows:

1. **Water** — the WebGL field, fixed behind the document for two sections.
2. **Ground** — `--surface` after the handoff, or `--raised` where a section steps forward.
3. **Content** — type and rules, moving at scroll speed.
4. **Grain** — a fixed, `pointer-events: none` noise overlay at 3.5%, GPU-cheap because it never scrolls.

Elevation is hairline plus space. The only boxes on the page are the spec grid
and the serves row, and both are drawn as 1px gaps over a rule colour rather than
as cards with borders.

Provenance is a **gradient field**, not a photograph: two radial pools over a
vertical ramp, with a masked diagonal rule pattern for parallax depth. It stays
on palette by construction and costs nothing to load.

---

## 5. The scene

One WebGL scene, alive for **exactly two sections**, then gone. Not a camera
tour — the brief was explicit that the bottle travels to the next section and no
further.

**Subject:** the Ashmont bottle, lathe-turned from a 44-point profile and then
fluted by modulating radius against angle (40 ribs, fading in above the heel and
out below the shoulder). The geometry is inherited from draft 02 because it was
already right; the **material and the artwork are not**. Glass is tinted deeper
(`#2f6ea8`, attenuation 0.62) so the flutes read as bands of blue rather than as
pale highlights. The label is a paper field with navy type, a hairline frame, a
serif monogram, `LONDON DRY GIN` and `POLAND`. There is no crest, no banner, no
gold, and no neck band — the reference leaves the neck as bare glass, and it is
the only place the water shows straight through the object.

**Water.** Two pieces:

- A **ripple simulation** — a damped wave equation in a ping-pong pair of
  half-float targets (256² desktop, 128² mobile), height in `.r` and velocity in
  `.g`. Edges are damped rather than reflected so the pool never rings. The
  pointer injects along the *segment* between its last and current position, so
  a fast cursor draws a continuous wake instead of a dotted line of impacts.
- A **caustic net**, built rather than sampled: two counter-rotating wave fronts,
  ridged so their crests become filaments, plus a third front on an
  incommensurable angle to break the lattice. Three octaves, each rotated and
  offset so no two share a grid. The height field's gradient displaces the net,
  which is what makes the cursor read as light bending rather than as a filter.

**Composition is enforced in the shader.** The light belongs to the object, not
to the copy: in landscape the left third is pulled down to 36% brightness so the
headline has a quiet ground; in portrait the same falloff runs bottom-up, because
that is where the copy moves to.

**Poses.** Two, and portrait gets its own set rather than the landscape framing
scaled down — a tall frame puts the copy across the full width, so the bottle
moves up and back and hands the lower half of the screen to the type.

| | Hero | Surface |
|---|---|---|
| Landscape | camZ 6.10, fov 33, right third, cropped | camZ 8.60, fov 30, whole bottle beside the copy |
| Portrait | camZ 11.5, fov 40, upper right, small | camZ 12.0, fov 38, upper centre |

**The handoff.** The drained water is `--surface` exactly, so the canvas hands
off to the page with no seam. The waterline is wavy (driven by the live ripple
height) and carries a bright glint band as it crosses.

**Anchoring.** Pose and drain are two separate ScrollTriggers anchored to real
elements, never to fractions of a guessed total:

- Pose: `#top top top` → `.surface__copy bottom 40%`
- Drain: `.surface__copy bottom top` → `.surface bottom bottom`

`.surface` carries a **180dvh tail**. That number is arithmetic: the drain ends
when the section's bottom meets the viewport's bottom, so usable drain distance
is *tail minus one viewport*. 180dvh buys roughly 80dvh of held, copy-free water
for the waterline to cross. Draining under live copy is what would strand light
type on a light ground, and the tail is the fix.

**Quality tiers:** transmission glass and a 256² sim on desktop; refraction-free
glass, halved segments and a 128² sim on mobile and low-memory devices. DPR
capped at 2 (1.5 on medium). Under `prefers-reduced-motion` the scene is a still
image that tracks the scroll and redraws only when something changed.

---

## 6. Motion

**GSAP owns the clock, Lenis owns the scroll position, ScrollTrigger listens to
Lenis.** One ticker, one source of truth, no competing rAF loops. The scene
renders inside `gsap.ticker` so it cannot drift out of step.

| Token | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | Entrances, reveals |
| `--ease-inout` | `cubic-bezier(.65,.05,.36,1)` | State transitions |
| `--ease-soft` | `cubic-bezier(.4,.14,.3,1)` | Hover, small UI |
| Lenis lerp | `.085` | Smooth scroll |
| Scene scrub | `.6` | Both scroll triggers |

Durations: micro 160ms · UI 320ms · reveal 760ms · scene handoff, scrubbed.

**One property, one owner.** A CSS transition and a GSAP tween on the same
property is a bug, not a redundancy — it is how the stage ended up frozen half
faded. CSS owns `.stage` opacity; GSAP owns reveals and magnetics.

Three reveal primitives, and every animated element uses one:

- `[data-split]` — display type, revealed a line at a time. Lines are **measured**,
  not guessed: words are wrapped, offsets read once, then grouped, so a reflow at
  any width still breaks in the right places. Inline marks travel with the word
  they follow rather than becoming a line of their own.
- `[data-reveal]` — a single block rising 22px into place.
- `[data-stagger]` — a list arriving in sequence at 55ms.

`prefers-reduced-motion: reduce` drops Lenis for native scrolling, freezes the
scene, and turns every reveal into its final state.

---

## 7. Micro-interactions

| Element | Behaviour |
|---|---|
| Cursor | 30px ring, `pointer: fine` only, damped at 0.19. Scales to 58px and inverts over interactive elements. **Hidden over the hero and the surface** — there, the water is the cursor. Hidden until the pointer first moves, so a fresh page never opens with a ring parked in the middle of the frame. |
| Water | Pointer velocity injects into the ripple buffer along the segment travelled. Touch injects at 1.4× on `touchmove`. An idle drop lands every few seconds so an untouched hero still breathes. |
| Buttons | Magnetic pull, **8px maximum** — past that it reads as a control running away from the pointer. Fill wipes up from the bottom. |
| Links | Underline draws left to right on hover; the hero CTA's rule brightens rather than draws, and its arrow advances 7px. |
| Botanicals | Hovering one row dims the other six to 42%. The index reads as one thing, not seven competing tiles. |
| Nav | Scrim over water, blurred bar over daylight, flipped at exactly the drain's anchor. Hides on downward scroll, never over the hero. |
| Preloader | Real progress against fonts and the first scene frame, then a vertical wipe. Resolves on a timeout as well as on rAF, because a background tab pauses rAF and would otherwise strand the counter. |
| Focus | 2px accent ring at 3px offset, never removed, colour-flipped on deep grounds. |

---

## 8. Layout

Grid: `max-width: 1440px`, gutter `clamp(20px, 4.4vw, 72px)`, section rhythm
`clamp(104px, 15vh, 190px)`.

**Layout families, each used once**, and none shared with draft 02's set:

1. Scene hero, type bottom-left in the frame
2. Split hold — copy left, object right, scene's last section
3. Ruled editorial index (botanicals)
4. Sticky head beside a spec grid (distillation)
5. Three-up ruled row (serves)
6. Full-bleed gradient field (provenance)
7. Split form (find a bottle)

**Mobile (`< 760px`)** collapses every asymmetric layout to one column. The hero
type *grows* relative to the frame rather than shrinking. The surface section
pushes its copy to 46dvh so the bottle owns the upper half. The nav becomes its
own two-column bar rather than the desktop grid with a hole in it. Touch targets
get 9–10px of extra block padding. `100dvh` everywhere, never `100vh`.

---

## 9. Voice

Short. Declarative. Cold. Specific numbers only where they are real.
No "elevate", no "seamless", no "crafted with passion".
**Zero em-dashes** anywhere in the interface.

The closing CTA is **"Find a bottle"**, and the form says plainly that Ashmont is
a design concept rather than pretending to submit.
