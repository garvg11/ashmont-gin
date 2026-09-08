# Ashmont — direction 04, "Heritage"

The source of truth for this draft. Every visual decision below is deliberate.
If a change conflicts with this file, change this file first.

Unlike drafts 01 to 03, this one is **not** an invented direction. It is a build
of a supplied comp (`Ashmont Mocks.pdf`, one 750 x 4500 pt page) at as close to
full fidelity as a real, responsive, accessible website allows. Where this file
departs from the comp, it says so and says why.

---

## 1. The read

**Premium consumer brand site (craft spirits)** for design-conscious drinkers and
on-trade buyers. Language: **navy, gold and cream. Heritage luxury, photographic.**

**The structural idea:** the comp alternates grounds section by section, deep
navy to marble to cream to near-black and back to light. That alternation is the
composition, not an accident, so this build follows it rather than locking the
page to a single theme.

| Beat | Section | Ground | Feeling |
|---|---|---|---|
| Arrival | Hero | Water, navy | The object, in a lit medium you can touch |
| Invitation | Our world | Blue hour | Somewhere worth being |
| Proof | The gin | Marble | Here is the thing itself |
| Origin | Two origins | Cream | It comes from two real places |
| Method | The making | Navy | Somebody decided each of these steps |
| Standing | Awards | Near-black | Other people agree |
| Permission | Serves | Marble | You could pour this tonight |
| Ritual | The house serve | Light | One drink, made properly |
| Close | Footer | Paper | Everything else |

---

## 2. Colour

Sampled off the comp with a quantiser, not picked by eye. **Gold is the only
accent** and it appears on every ground.

| Token | Value | Use |
|---|---|---|
| `--navy-950` | `#050f22` | Legal bar, loader, drawer |
| `--navy-900` | `#081b3c` | The making |
| `--blue-600` | `#2b5c9e` | Mid water |
| `--haze` | `#a9c5dd` | Secondary type on navy |
| `--marble` | `#dfe5ec` | The gin, serves |
| `--paper` | `#eef2f7` | Footer |
| `--cream` | `#f7efe4` | Two origins |
| `--slate-950` | `#0b0e12` | Awards |
| `--gold` | `#b8955f` | The accent, mid value |
| `--gold-lt` | `#cfae7c` | Gold on dark grounds |
| `--gold-dk` | `#7e613a` | Gold on light grounds |

**The gold is split into two values on purpose.** A single gold cannot clear AA
on both `#050f22` and `#f7efe4`. `--accent` resolves to `--gold-dk` on light and
`--gold-lt` under `.on-dark`, so the accent reads as one colour while actually
being two.

**Verified contrast** (AA floor 4.5:1, measured, not assumed):

| Pair | Ratio |
|---|---|
| `--ink` on `--marble` | 13.3 |
| `--ink-2` on `--marble` | 6.4 |
| `--ink-3` on `--marble` | 4.7 |
| accent gold on `--marble` | 4.5 |
| accent gold on `--cream` | 5.0 |
| accent gold on `--paper` | 5.1 |
| bone on `--navy-900` | 15.3 |
| `--haze` on `--navy-900` | 9.5 |
| `--gold-lt` on `--navy-900` | 8.1 |
| `--gold-lt` on `--slate-950` | 9.2 |

---

## 3. Type

| Role | Family | Why |
|---|---|---|
| Display | **Playfair Display** (variable, roman and italic) | The comp's headline is a high-contrast Didone with ball terminals and fine flat serifs. Playfair is the closest freely licensable match. Draft 02 owns Bodoni Moda and draft 03 owns Fraunces, so this is a third distinct face. |
| Everything else | **Jost** (variable 300-600) | A geometric sans that survives the very wide tracking the comp uses on nav, eyebrows and labels. |

Rules:

- Display sits at **weight 400**, tight leading, wide measure. That ratio is most
  of what makes it read as a spirits brand rather than a blog.
- **Emphasis is gold italic of the same family.** Never a second serif dropped
  into a sans line. `.display em` carries `line-height: 1.12` and a bottom pad,
  because Playfair's italic descenders clip against a `overflow: hidden` line
  mask otherwise.
- Eyebrows are 12px, weight 500, `.26em` tracking, uppercase, gold. The gap
  between that and a 95px display line is the house signature.
- The hero's full stop is a **rotated square**, drawn as an inline element that
  travels with the last word through the line splitter.
- Fluid scale via `clamp()`, anchored to a 1440px design width.

---

## 4. Shape and material

**Shape: sharp.** `--radius: 2px` on every surface and control. The comp has no
rounded anything, which is a deliberate opposition to draft 03's pill buttons.

**Two controls only**, both taken from the comp:

1. A ruled text link with an arrow that advances on hover.
2. A hairline gold box that fills upward on hover.

There are no filled buttons anywhere on the page.

**Rules carry structure, not boxes.** Sections are separated by hairlines broken
with a small gold diamond (`.crest-rule`). The spec list, the process timeline
and the footer columns are all built from rules and space rather than cards.

---

## 5. Photography

The comp is roughly ninety percent photographic, and its images are flattened
together with its typography, so there were no assets to extract. Photography is
therefore **sourced from Unsplash** (free for commercial use, no attribution
required) and **graded into the brand at build time**.

**The grade is what makes nine unrelated stock frames read as one commissioned
shoot.** Each image is pushed toward a three-stop ramp, deep navy shadows through
royal-blue mids to warm cream highlights, blended back over the original at a
per-image strength. Draft 02 pioneered this duotone treatment as a runtime CSS
blend; here it is baked into the files, so it costs nothing per frame and can
never drift.

| Slot | Grade | Note |
|---|---|---|
| Hero water | 0.82 | Strongest. It has to carry the whole navy read. |
| Our world | 0.62 | Keeps the warm town lights |
| Marble | 0.34 | Lightest touch, the stone is already neutral |
| Juniper | 0.55 | |
| Forest | 0.60 | |
| Copper still | 0.58 | Retains the copper, which is on-brand |
| Martini | 0.50 | |
| House serve | 0.55 | |

Every image ships at 800, 1280 and 1920 wide as WebP with a `srcset`, so a phone
never downloads a desktop plate. The awards ground is **CSS, not a photograph**,
because that noise texture cost half a megabyte and bought nothing.

Source photo IDs are recorded in `README.md` so the set can be re-fetched or
re-graded.

---

## 6. The bottle

One WebGL object, alive for two sections. The geometry is inherited from draft 03
because it was already right: a lathe-turned profile fluted by modulating radius
against angle. **The material and the artwork are not inherited.**

- Glass is saturated cobalt (`#1b46a4`, attenuation 0.42) so the flutes read as
  ribs of solid colour, matching the comp's bottle rather than draft 03's water blue.
- The cap is **polished brass**, the only warm metal on the object and the only
  place gold appears in three dimensions.
- The label is cream paper with navy type: `CRAFTED IN POLAND`, `ASHMONT`, a gold
  rule, `LONDON DRY GIN`, a small heraldic crest, `16 BOTANICALS`, and
  `700 ml | 43% ABV`. Drawn to a canvas, so it stays a few kilobytes of maths.

**Poses**, with portrait getting its own set rather than the landscape framing
scaled down:

| | Hero | The gin |
|---|---|---|
| Landscape | camZ 6.6, fov 32, right of frame, cropped | camZ 8.2, fov 30, settled in the left column |
| Portrait | camZ 11.4, fov 40, upper right, small | camZ 10.6, fov 40, upper centre |

Through the product section the bottle accepts **drag to rotate**, which is the
interaction the comp explicitly invites with its "click and drag" cue. Drag only
adds to the pose rotation, so releasing leaves the bottle where the reader put
it. Arrow keys do the same thing from the hint, which is focusable.

---

## 7. The liquid hero

Draft 03's signature was that the pointer pushed the water. That is kept here,
and improved: **the photograph itself ripples.**

- A damped wave equation runs in a ping-pong pair of half-float targets
  (256² desktop, 128² mobile), height in `.r` and velocity in `.g`.
- The pointer injects along the **segment** between its last and current
  position, so a fast cursor draws a continuous wake rather than a dotted line
  of impacts.
- The height field's gradient displaces the UVs of the hero plate before it is
  sampled, so what bends is the actual water in the picture. A specular sheet
  tinted to cold daylight rides the crests.
- Edges bleed rather than reflect, so the pool never rings.
- An idle drop lands every few seconds, so an untouched hero still breathes.

The rippled plate fades out by pose 0.42 and hands back to the static `<img>`,
which stays in the markup for no-JS and no-WebGL. Under `prefers-reduced-motion`
the water layer is never created at all.

**Layering.** The canvas is fixed at `z-index: 4`, above the section plates and
below the navigation. `<main>` deliberately carries **no** z-index: a stacking
context there would trap every section under the canvas, and no z-index on a
child can escape its parent's context. The hero's scrim and copy sit at 5 and 6.

---

## 8. Motion

GSAP owns the clock, Lenis owns scroll position, ScrollTrigger listens to Lenis.
One ticker, one source of truth. The scene renders inside `gsap.ticker`.

| Token | Curve | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | Entrances, reveals |
| `--ease-inout` | `cubic-bezier(.65,.05,.36,1)` | State transitions |
| `--ease-soft` | `cubic-bezier(.4,.14,.3,1)` | Hover, small UI |
| Lenis lerp | `.085` | Smooth scroll |
| Pose scrub | `.7` | Hero to product |

Four reveal primitives, and every animated element uses one:

- `[data-split]` display type, revealed a line at a time. Lines are **measured**,
  not guessed. Source whitespace is recorded per unit and re-emitted on rebuild,
  which is what stops an inline `<em>` welding itself to the word before it.
- `[data-reveal]` a block rising into place.
- `[data-stagger]` a list arriving in sequence.
- `[data-media-reveal]` a clip reveal paired with an inner scale, so a photograph
  settles into its frame rather than sliding into it.

Both scroll ranges are anchored to **elements**, never to a fraction of a guessed
page height, and liveness is derived from progress rather than latched, so a
refresh at a different height cannot desync it.

---

## 9. Layout

Grid max `1560px`, gutter `clamp(20px, 5vw, 88px)`, section rhythm
`clamp(96px, 13vh, 170px)`.

Layout families, each used once:

1. Photographic hero, type bottom-left, object right
2. Photographic plate with a single left column (our world)
3. Object stage beside a spec rail (the gin)
4. Facing pair across a centred seal (two origins)
5. Numbered timeline on a gold rule (the making)
6. Three-up marks with a bordered quote (awards)
7. Copy beside a framed plate (serves)
8. Photographic plate with a short left stack (the house serve)
9. Centred brand block over four columns (footer)

**Mobile (`< 760px`)** collapses every multi-column layout to one column. The
facing pair stacks with the seal moved to the top. The timeline drops its rule
and becomes a vertical list. Photographic scrims rotate from horizontal to
vertical so copy keeps its ground when it moves under the image. Touch targets
gain block padding. `100dvh` everywhere, never `100vh`.

---

## 10. Where this departs from the comp

Recorded honestly, because "99% similar" was the brief and these are the missing
percent.

1. **Scroll cue dropped.** The comp has "SCROLL TO CONTINUE" with a circled
   arrow. If the reader has not scrolled yet they are looking at the hero, and
   the bottom of the viewport does not need a label.
2. **Eyebrow count reduced** from roughly seven to three. Every AI-built site
   puts a small uppercase label above every section and the result is a
   templated rhythm. Three carry meaning; the rest were removed and the
   headlines do the work alone.
3. **Award medallions are typographic, not rendered artwork.** The comp's are
   photographed metal. Reproducing real award seals for a fictional brand would
   be fabricating credentials, so these are drawn as marks.
4. **No juniper branch silhouettes** framing the hero edges.
5. **Botanical count follows the comp** (16, 43% ABV, 700 ml), which differs from
   drafts 02 and 03 (7 botanicals, 45.2%, 50 cl). The comp wins.
6. **Sixteen botanicals are stated, not listed.** The comp does not enumerate
   them and neither does this.

---

## 11. Voice

Short. Declarative. Specific numbers only where the comp states them.
**Zero em-dashes** anywhere in the interface.

The closing CTA is **"Shop Ashmont"**, used once. The footer form says plainly
that Ashmont is a design concept rather than pretending to submit.
