/* ============================================================
   The persistent WebGL scene.

   One camera move through one space, driven by the scroll timeline.
   Not a looping background: every beat is anchored to a real section,
   measured from the document so it stays in sync at any viewport size.
   ============================================================ */

import * as THREE from '../../vendor/three.module.min.js';
import { createBottle } from './bottle.js';
import { onFrame } from '../core/raf.js';
import { clamp, damp, smoothstep, env as environment } from '../core/env.js';

/* Camera keyframes. `at` names the section the beat is anchored to.
   Positions are in bottle-space, where the bottle's mass sits near y = 0. */
/* A negative look.x aims the camera left of the bottle, which pushes the
   bottle into the right of the frame and leaves the left column for type. */
/* The scene surges, recedes, surges once more, then leaves. It is the
   subject during the hero and the bottle, and only atmosphere while the
   reader is doing actual reading. Content sections that carry dense
   copy get the scene pulled almost to nothing so type keeps its ground. */
const BEATS = [
  { at: 'top',          pos: [1.60, 0.15, 7.60],  look: [-1.05, 0.00, 0], fov: 30, spin: 0.0,  opacity: 1.00 },
  { at: 'manifesto',    pos: [1.25, 0.08, 4.60],  look: [-1.70, 0.05, 0], fov: 28, spin: 0.5,  opacity: 0.62 },
  { at: 'botanicals',   pos: [0.40, 0.60, 13.0],  look: [0.95, 0.10, 0],  fov: 32, spin: 1.1,  opacity: 0.14 },
  { at: 'distillation', pos: [-2.40, 0.70, 7.60], look: [-1.30, 0.05, 0], fov: 28, spin: 2.0,  opacity: 0.10 },
  { at: 'bottle',       pos: [1.20, -0.05, 6.50], look: [-2.32, -0.15, 0], fov: 30, spin: 2.6, opacity: 1.00 },
  { at: 'serves',       pos: [0.60, 0.30, 9.20],  look: [-1.40, 0.05, 0], fov: 32, spin: 3.0,  opacity: 0.10 },
  { at: 'provenance',   pos: [0.80, 1.40, 11.0],  look: [0.00, 0.10, 0],  fov: 34, spin: 3.3,  opacity: 0.00 },
];

const THEME = {
  dark:  { fog: 0x04080f, glowA: 0x2b58ad, glowB: 0x04080f, key: 0xdce7ff, rim: 0x4d84ff, fill: 0x0b2a6b, motes: 0x8fb4ff, fogDensity: 0.028 },
  light: { fog: 0xeef0f5, glowA: 0xdae4f7, glowB: 0xeef0f5, key: 0xffffff, rim: 0x1e45b8, fill: 0xa8bde8, motes: 0x4a6bb8, fogDensity: 0.022 },
};

export function createScene(container, { tier = 'high' } = {}) {
  const themeName = () =>
    document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  let theme = themeName();
  let palette = THEME[theme];

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: tier === 'high',
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  const maxDpr = tier === 'high' ? 2 : tier === 'medium' ? 1.6 : 1.25;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(palette.fog, palette.fogDensity);

  const camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(...BEATS[0].pos);

  /* ---------- Environment map ----------
     A procedural studio: dark ground, two soft bands standing in for
     softboxes. Those bands are what make the glass edges legible. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;

  function buildEnvironment() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');

    const base = ctx.createLinearGradient(0, 0, 0, 256);
    if (theme === 'dark') {
      base.addColorStop(0, '#0d1a33');
      base.addColorStop(0.48, '#060c17');
      base.addColorStop(1, '#02050b');
    } else {
      base.addColorStop(0, '#f2f6ff');
      base.addColorStop(0.5, '#b7c6e2');
      base.addColorStop(1, '#5d6f92');
    }
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 256);

    const band = (cx, cy, rx, ry, strength) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      g.addColorStop(0, `rgba(255,255,255,${strength})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      ctx.translate(-cx, -cy);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 256);
      ctx.restore();
    };

    // Narrow vertical strips, not soft blobs. A wide soft source gives glass
    // a matte plastic look; a strip gives it the hard specular edge that
    // reads as glass.
    band(96, 112, 22, 260, 1);
    band(150, 96, 14, 200, 0.85);
    band(322, 120, 30, 240, theme === 'dark' ? 0.5 : 0.66);
    band(430, 48, 46, 70, theme === 'dark' ? 0.34 : 0.46);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    if (envRT) envRT.dispose();
    envRT = pmrem.fromEquirectangular(tex);
    scene.environment = envRT.texture;
    tex.dispose();
  }
  buildEnvironment();

  /* ---------- Backdrop ----------
     Transmission needs something behind the glass to bend. This pool of
     light is that something, and it doubles as the scene's depth cue. */
  const backdropMat = new THREE.ShaderMaterial({
    uniforms: {
      uA: { value: new THREE.Color(palette.glowA) },
      uB: { value: new THREE.Color(palette.glowB) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uA;
      uniform vec3 uB;
      varying vec2 vUv;
      void main() {
        // A pool of light standing behind the bottle, not a full wash.
        // The falloff is tight so the page keeps its dark ground.
        vec2 p = vUv - vec2(0.53, 0.54);
        p.x *= 1.55;
        float d = length(p);
        float core = smoothstep(0.19, 0.0, d);
        float halo = smoothstep(0.44, 0.04, d) * 0.32;
        gl_FragColor = vec4(mix(uB, uA, clamp(core + halo, 0.0, 1.0)), 1.0);
      }
    `,
    depthWrite: false,
    fog: false,
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), backdropMat);
  backdrop.position.set(0, 0.35, -7.5);
  scene.add(backdrop);

  /* ---------- Light ---------- */
  const key = new THREE.DirectionalLight(palette.key, theme === 'dark' ? 2.4 : 3.1);
  key.position.set(-3.2, 4.4, 3.6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(palette.rim, theme === 'dark' ? 4.2 : 2.2);
  rim.position.set(3.4, 1.6, -3.2);
  scene.add(rim);

  const fill = new THREE.HemisphereLight(palette.key, palette.fill, theme === 'dark' ? 0.5 : 1.1);
  scene.add(fill);

  /* ---------- Bottle ---------- */
  const bottle = createBottle({ tier, theme });
  scene.add(bottle.group);

  /* ---------- Motes ----------
     Drift is computed in the vertex shader, so this costs no CPU. */
  const moteCount = tier === 'high' ? 900 : tier === 'medium' ? 420 : 0;
  let motes = null;

  if (moteCount) {
    const positions = new Float32Array(moteCount * 3);
    const seeds = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const moteMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(palette.motes) },
        uSize: { value: tier === 'high' ? 2.6 : 2.2 },
        uOpacity: { value: theme === 'dark' ? 0.34 : 0.26 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime;
        uniform float uSize;
        uniform float uPixelRatio;
        varying float vFade;
        void main() {
          vec3 p = position;
          float t = uTime * (0.06 + aSeed * 0.09);
          p.y = mod(p.y + t + 5.5, 11.0) - 5.5;
          p.x += sin(uTime * 0.18 + aSeed * 32.0) * 0.34;
          p.z += cos(uTime * 0.14 + aSeed * 21.0) * 0.28;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (uSize * uPixelRatio * (1.0 + aSeed)) * (7.0 / -mv.z);
          vFade = smoothstep(0.0, 3.0, -mv.z) * (1.0 - smoothstep(9.0, 17.0, -mv.z));
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vFade;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.06, d) * uOpacity * vFade;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    motes = new THREE.Points(geo, moteMat);
    scene.add(motes);
  }

  /* ---------- Timeline ---------- */
  const beats = BEATS.map((b) => ({ ...b, p: 0 }));
  const target = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3(...BEATS[0].pos);
  const camLook = new THREE.Vector3(...BEATS[0].look);

  let progress = 0;
  let fov = BEATS[0].fov;
  let opacity = 1;
  let spin = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerTX = 0;
  let pointerTY = 0;
  let time = 0;
  let visible = true;
  let snap = true;

  function measure() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    for (const b of beats) {
      const el = document.getElementById(b.at);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      // Anchor the beat to the moment the section owns the screen.
      b.p = clamp((top + rect.height * 0.35 - window.innerHeight * 0.5) / max);
    }
    beats[0].p = 0;
    beats[beats.length - 1].p = Math.max(beats[beats.length - 1].p, 0.92);
    // Keep the sequence monotonic even if a section is unusually short.
    for (let i = 1; i < beats.length; i++) {
      if (beats[i].p <= beats[i - 1].p) beats[i].p = beats[i - 1].p + 0.001;
    }
  }

  function sample(p) {
    let i = 0;
    while (i < beats.length - 2 && p > beats[i + 1].p) i++;
    const a = beats[i];
    const b = beats[i + 1];
    const t = smoothstep(a.p, b.p, p);

    target.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t
    );
    lookTarget.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t
    );
    fov = a.fov + (b.fov - a.fov) * t;
    opacity = a.opacity + (b.opacity - a.opacity) * t;
    spin = a.spin + (b.spin - a.spin) * t;
  }

  function applyTheme(next) {
    theme = next;
    palette = THEME[theme];
    scene.fog.color.set(palette.fog);
    scene.fog.density = palette.fogDensity;
    backdropMat.uniforms.uA.value.set(palette.glowA);
    backdropMat.uniforms.uB.value.set(palette.glowB);
    key.color.set(palette.key);
    key.intensity = theme === 'dark' ? 2.4 : 3.1;
    rim.color.set(palette.rim);
    rim.intensity = theme === 'dark' ? 4.2 : 2.2;
    fill.color.set(palette.key);
    fill.groundColor.set(palette.fill);
    fill.intensity = theme === 'dark' ? 0.5 : 1.1;
    if (motes) {
      motes.material.uniforms.uColor.value.set(palette.motes);
      motes.material.uniforms.uOpacity.value = theme === 'dark' ? 0.34 : 0.26;
      motes.material.blending = theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
      motes.material.needsUpdate = true;
    }
    bottle.setTheme(theme);
    buildEnvironment();
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Narrow screens: pull back so the bottle is never cropped, and let the
    // composition recentre because the layout is a single column there.
    camera.userData.narrow = clamp((980 - w) / 620);
    camera.updateProjectionMatrix();
    if (motes) motes.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    measure();
    snap = true;
  }

  resize();

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize, { passive: true });
  window.addEventListener('ashmont:theme', (e) => applyTheme(e.detail.theme));

  if (!environment.touch && !environment.reducedMotion) {
    window.addEventListener(
      'pointermove',
      (e) => {
        pointerTX = (e.clientX / window.innerWidth - 0.5) * 2;
        pointerTY = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );
  }

  // Stop rendering entirely once the scene has faded out or the tab hides.
  const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
    threshold: 0,
  });
  io.observe(container);

  const still = environment.reducedMotion || tier === 'low';

  function render(dt) {
    time += dt;

    sample(progress);

    // Cursor parallax. Damped and small: the object should feel heavy.
    pointerX = damp(pointerX, pointerTX, 0.06, dt);
    pointerY = damp(pointerY, pointerTY, 0.06, dt);

    const n = camera.userData.narrow || 0;

    // Viewport-corrected targets. On a narrow screen the camera pulls back
    // and aims below the bottle, which lifts it into the top half of the
    // screen and leaves the lower half clear for the stacked copy.
    const wantX = target.x * (1 - n * 0.55) + pointerX * 0.3;
    const wantY = target.y - pointerY * 0.2;
    const wantZ = target.z * (1 + n * 0.68);
    const lookX = lookTarget.x * (1 - n);
    const lookY = lookTarget.y - n * 1.35;

    if (snap) {
      // The first frame, and every frame after a resize, must already be
      // composed. Damping in from the raw keyframe would show the reader a
      // second of the wrong crop before it settles.
      camPos.set(wantX, wantY, wantZ);
      camLook.set(lookX, lookY, lookTarget.z);
      camera.fov = fov;
      camera.updateProjectionMatrix();
      snap = false;
    } else {
      camPos.set(
        damp(camPos.x, wantX, 0.09, dt),
        damp(camPos.y, wantY, 0.09, dt),
        damp(camPos.z, wantZ, 0.09, dt)
      );
      camLook.set(
        damp(camLook.x, lookX, 0.12, dt),
        damp(camLook.y, lookY, 0.12, dt),
        damp(camLook.z, lookTarget.z, 0.12, dt)
      );
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = damp(camera.fov, fov, 0.1, dt);
        camera.updateProjectionMatrix();
      }
    }

    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // A slow idle turn on top of the scroll-driven spin, so the bottle is
    // never completely still even when the reader is.
    bottle.group.rotation.y = spin + (still ? 0 : Math.sin(time * 0.12) * 0.06);

    if (motes) motes.material.uniforms.uTime.value = time;

    container.style.opacity = opacity.toFixed(3);
    renderer.render(scene, camera);
  }

  let stop = null;
  if (still) {
    // One frame, then nothing. No loop, no battery cost.
    render(0);
  } else {
    stop = onFrame((dt) => {
      if (!visible || opacity < 0.015) {
        // Still sample the timeline so it is correct the moment it returns.
        sample(progress);
        container.style.opacity = opacity.toFixed(3);
        return;
      }
      render(dt);
    });
  }

  container.dataset.ready = 'true';

  return {
    // Read-only introspection for development and for verifying framing.
    debug: () => ({
      camera: camera.position.toArray().map((v) => +v.toFixed(2)),
      look: camLook.toArray().map((v) => +v.toFixed(2)),
      fov: +camera.fov.toFixed(1),
      narrow: +(camera.userData.narrow || 0).toFixed(3),
      progress: +progress.toFixed(4),
      opacity: +opacity.toFixed(2),
      beats: beats.map((b) => ({ at: b.at, p: +b.p.toFixed(4) })),
    }),

    setProgress(p) {
      progress = clamp(p);
      if (still) {
        sample(progress);
        render(0);
      }
    },
    refresh() {
      measure();
      snap = true;
    },
    resize,
    dispose() {
      if (stop) stop();
      io.disconnect();
      bottle.dispose();
      backdrop.geometry.dispose();
      backdropMat.dispose();
      if (motes) {
        motes.geometry.dispose();
        motes.material.dispose();
      }
      if (envRT) envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.remove();
    },
  };
}
