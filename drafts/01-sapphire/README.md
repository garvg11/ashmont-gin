# Ashmont Gin

An interactive brand site for a craft gin. Deep sapphire, cold light, one continuous
WebGL camera move anchored to the scroll.

**Ashmont is a fictional brand built as a design concept.** The distillery, the people,
the stockists and the product claims are invented. Replace them before this goes anywhere public.

Read [DESIGN.md](DESIGN.md) first. It is the source of truth for palette, type, motion and
the 3D scene. If you change something here that contradicts it, change that file too.

---

## Run it

```bash
python serve.py
```

Then open <http://localhost:5173>. Pass a port if 5173 is busy: `python serve.py 5178`.

Any static file server works. The one requirement is that it is **served over HTTP**, not
opened as a `file://` path, because the JavaScript is ES modules and browsers block module
loading from the filesystem.

### On a phone

The server listens on every interface, so a phone on the same Wi-Fi can open it directly.
The start-up banner prints the address, for example:

```
  this machine   http://localhost:5173
  same Wi-Fi     http://192.168.29.12:5173
```

Type the `same Wi-Fi` address into the phone's browser. Both devices must be on the same
network, and the laptop must stay awake.

If it does not connect, Windows Firewall is blocking the inbound request. Either allow
`python.exe` when Windows prompts, or open the port once from an **administrator**
PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Ashmont dev" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Any
```

Two things to know when testing on a real device. The quality tier drops to `medium`, so
the glass loses refraction and uses the cheaper tinted material. And smooth scrolling is
deliberately off on touch, because the platform's own momentum is better than anything
simulated.

---

## About Node

There is no Node or npm on this machine, so this is built with **no build step**: plain
HTML, native CSS with custom properties, and ES modules. Three.js is vendored into
`vendor/`, and the fonts are self-hosted in `assets/fonts/`. Nothing is fetched from a CDN
at runtime except the placeholder photography.

That is a real advantage, not a workaround. The site has zero dependencies to audit, no
lockfile to rot, no framework upgrade path, and it deploys by copying the folder onto any
static host.

**You do not need Node to run, edit, or ship this.**

If you want it anyway, here is what it would buy you and how to get it.

### Installing Node on Windows

```bash
winget install OpenJS.NodeJS.LTS
```

Close and reopen the terminal afterwards so the `PATH` picks it up, then check:

```bash
node -v && npm -v
```

If `winget` is unavailable, download the LTS installer from <https://nodejs.org>.
No admin rights? Use a portable install via `fnm` or `nvm-windows` instead.

### What Node would add

| Tool | What it gives you |
|---|---|
| `npx serve` or Vite | Dev server with live reload, so you stop hard-refreshing |
| `npx lighthouse` | Real Core Web Vitals numbers instead of estimates |
| `npx playwright` | Automated screenshots across viewports, visual regression tests |
| `sharp` or `squoosh` | Convert the final photography to AVIF and WebP at several widths |
| `esbuild` | Minify and bundle the JS, roughly 30 percent off the transfer size |

None of that changes the site's architecture. It would stay a static site; the tooling
would only make iteration faster and the assets smaller.

**If you can install it, the highest-value use is image optimisation and Lighthouse.**
Tell me once it is available and I will wire up an asset pipeline and run a real audit.

---

## Structure

```
index.html            One page. All content and markup.
DESIGN.md             The design system. Read before changing anything visual.

css/
  tokens.css          Colour, type, spacing, motion, z-index. Both themes.
  base.css            Reset, typography, layout primitives, fixed atmosphere layers.
  components.css      Buttons, nav, cursor, preloader, age gate, media, forms.
  sections.css        The eight section layout families.

js/
  main.js             Boot order and wiring.
  core/
    env.js            Feature and preference probing, quality tiering, math.
    raf.js            The single frame loop. Nothing else calls requestAnimationFrame.
    scroll.js         Smooth scroll and the scroll-progress track registry.
  ui/
    boot.js           Preloader and age gate.
    reveal.js         Word splitting and IntersectionObserver reveals.
    sequences.js      Horizontal pan, sticky stack, manifesto, parallax, nav state.
    interactions.js   Cursor, magnetic buttons, drawer, theme, accordion, form.
  scene/
    scene.js          Renderer, environment, lights, camera timeline, motes.
    bottle.js         Lathe geometry, glass materials, canvas-drawn label.

vendor/three.module.min.js    Three.js r160, vendored.
assets/fonts/                 Bodoni Moda, Archivo, IBM Plex Mono. Latin subsets.
serve.py                      Local static server.
```

---

## Before launch

**Replace the placeholder photography.** Every image currently points at
`picsum.photos`, which returns a random photo per seed. It is deliberately duotoned into
the brand so it holds together, but it is not the brand's photography. Sixteen slots:

| Where | Count | Shot needed |
|---|---|---|
| Botanicals carousel | 7 | Macro, one per botanical, vertical 3:4 |
| Distillation stack | 4 | Maceration vessel, still, spirit safe, resting tanks. Landscape 4:3 |
| The bottle | 1 | Bottle shoulder and label detail, vertical |
| Serves | 3 | Martini, highball, negroni. Wide 2:1, dark |
| Provenance | 1 | The coastline. Wide, weather in it |

Export at 2x the displayed size, and keep the `width` and `height` attributes accurate so
nothing shifts as they load.

Also:

- Point the form at a real email endpoint. It is stubbed in `js/ui/interactions.js`, marked
  with a comment.
- Replace `https://ashmontgin.com` in the canonical, Open Graph and JSON-LD tags.
- Add `assets/og.jpg` at 1200x630. The meta tag already references it.
- Confirm the age gate satisfies the rules in every market you sell in. The current one is
  a single self-declared question stored in `localStorage`, which is the common pattern but
  not the strictest one.
- The stockist list is decorative. Wire the names to real URLs or remove them.

---

## How it behaves

**Motion.** One `requestAnimationFrame` loop drives everything. A single passive scroll
listener stores a number; all animation reads cached measurements inside that loop. There
are no per-frame scroll handlers and no layout reads during animation.

**Smooth scroll** drives the real window scroll position rather than transforming a
wrapper, which keeps `position: sticky`, IntersectionObserver, find-in-page, anchor links
and native focus scrolling working. It is disabled on touch, where the platform's own
momentum is better than anything simulated.

**The 3D scene** picks a quality tier from device memory, core count and pointer type.
High gets refractive transmission glass and 900 motes; medium drops transmission and half
the motes; low renders a single frame and stops. It stops rendering entirely when it has
faded out, when the tab is hidden, or when it scrolls off screen. If WebGL is missing the
scene is removed and the page keeps its atmosphere from CSS.

**Reduced motion** collapses smooth scroll to native, freezes the scene on one frame,
removes parallax, pinning and the custom cursor, and turns reveals into plain visibility.

**Without JavaScript** every section renders, all content is readable, and the preloader,
age gate and cursor are hidden.

**Themes.** Dark is the brand default. The site follows `prefers-color-scheme` and the nav
toggle overrides it, persisted in `localStorage`. The 3D scene repaints its environment,
fog, lights and label to match.

---

## Local development handle

On `localhost` only, `window.__ashmont` exposes `{ scroll, scene }`. `scene.debug()` returns
the live camera position, look target, field of view and the measured beat positions, which
is the fastest way to check framing after changing a keyframe. It is not defined on any
other host.
