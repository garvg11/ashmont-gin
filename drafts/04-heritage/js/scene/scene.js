window.M["scene/scene.js"] = (function () {
/* ============================================================
   The bottle.

   Direction 04 sits the object on photography rather than on a
   procedural pool, so this scene has no background of its own. The
   canvas is transparent and the graded plates behind it do the
   atmosphere. That makes the whole scene one lit object, which is
   cheap enough to keep at full quality on a phone.

   It is alive for two sections. In the hero it holds the right of
   frame. Through the product section it settles into the left column
   and accepts drag to rotate, which is the interaction the comp
   invites. Below that it stops rendering.
   ============================================================ */

const { clamp, damp, smoothstep } = window.M["core/env.js"];
const { createBottle } = window.M["scene/bottle.js"];
const { createWater } = window.M["scene/water.js"];

/* Two poses, and portrait gets its own set rather than the landscape
   framing scaled down. A tall frame gives the copy the full width, so
   the object moves up and back instead of competing with it. */
const POSE = {
  landscape: {
    hero:    { camZ: 6.6,  fov: 32, bx:  2.30, by: -0.10, ry: -0.40, scale: 1.30 },
    product: { camZ: 8.2,  fov: 30, bx: -1.55, by:  0.02, ry:  0.20, scale: 1.02 },
  },
  portrait: {
    hero:    { camZ: 11.4, fov: 40, bx:  0.55, by:  1.55, ry: -0.30, scale: 0.80 },
    product: { camZ: 10.6, fov: 40, bx:  0.00, by:  1.35, ry:  0.18, scale: 0.86 },
  },
};

const lerp = (a, b, t) => a + (b - a) * t;

function createScene(container, { tier = 'high', reducedMotion = false, heroPlate = null, heroAspect = 4 / 3 } = {}) {
  const canvas = container.querySelector('canvas');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: tier === 'high',
    alpha: true,                 /* the photography behind is the backdrop */
    powerPreference: 'high-performance',
    stencil: false,
  });
  const maxDpr = tier === 'high' ? 2 : tier === 'medium' ? 1.5 : 1.25;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    POSE.landscape.hero.fov,
    container.clientWidth / container.clientHeight,
    0.1, 60
  );
  camera.position.set(0, 0, POSE.landscape.hero.camZ);

  /* ---------- Environment ----------
     A studio rather than a sky: one bright softbox band high, a dimmer
     fill low, and a warm sliver so the brass cap has something to
     catch. Those bands are what draw the highlight down each flute. */
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 256; envCanvas.height = 128;
  {
    const ctx = envCanvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.00, '#ffffff');
    g.addColorStop(0.30, '#c8d8ea');
    g.addColorStop(0.62, '#33507a');
    g.addColorStop(1.00, '#070f1d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    ctx.globalAlpha = 0.9;  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 4, 256, 13);
    ctx.globalAlpha = 0.34; ctx.fillRect(0, 30, 256, 6);
    ctx.globalAlpha = 0.30; ctx.fillStyle = '#e8c9a0'; ctx.fillRect(150, 44, 70, 10);
    ctx.globalAlpha = 1;
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  const envRT = pmrem.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  envTex.dispose();
  pmrem.dispose();

  /* ---------- Light ---------- */
  const key = new THREE.DirectionalLight(0xf4f9ff, 2.9);
  key.position.set(-2.4, 5.0, 3.6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8fbde8, 1.6);
  rim.position.set(3.8, 1.0, -3.2);
  scene.add(rim);

  scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x0a1830, 0.75));

  /* ---------- The liquid hero ----------
     The plate itself is rippled, so the photograph bends under the
     pointer. It only exists while the hero is on screen. */
  /* Not under file://. Chrome treats a local image as cross-origin and
     refuses to upload it as a WebGL texture, which would leave the hero
     rippling a black plate. Double-clicking index.html is a supported
     way to open this draft, so there the static photograph stands in
     and only the ripple is lost. */
  const canSampleLocalPlate = location.protocol !== 'file:';
  const water = (heroPlate && !reducedMotion && canSampleLocalPlate)
    ? createWater(renderer, { src: heroPlate, size: tier === 'high' ? 256 : 128 })
    : null;
  let waterFade = 1;

  /* ---------- Bottle ---------- */
  const bottle = createBottle({ tier });
  const pivot = new THREE.Group();
  pivot.add(bottle.group);
  scene.add(pivot);

  /* ---------- State ---------- */
  let pose = 0;          /* 0 hero framing, 1 settled in the product column */
  let spin = 0;          /* accumulated drag, radians */
  let spinTo = 0;
  let pointerX = 0, pointerY = 0;
  let curX = 0, curY = 0;
  let portrait = false;
  let dirty = true;
  let disposed = false;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    portrait = camera.aspect < 0.95;
    if (water) water.resize(w, h, heroAspect);
    dirty = true;
    apply(1 / 60);
  }

  function setPose(p) {
    pose = clamp(p, 0, 1);
    /* The plate hands back to the static <img> well before the product
       section, so nothing is rippling where nothing is water. */
    waterFade = 1 - smoothstep(0, 0.42, pose);
    if (water) water.setFade(waterFade);
    dirty = true;
  }
  function setPointer(nx, ny) { pointerX = nx; pointerY = ny; }
  function addSpin(dx) { spinTo += dx; dirty = true; }

  function apply(dt) {
    const set = portrait ? POSE.portrait : POSE.landscape;
    const t = smoothstep(0, 1, pose);

    const camZ = lerp(set.hero.camZ, set.product.camZ, t);
    const fov  = lerp(set.hero.fov,  set.product.fov,  t);
    if (Math.abs(camera.fov - fov) > 0.001 || Math.abs(camera.position.z - camZ) > 0.001) {
      camera.position.z = camZ;
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    pivot.position.x = lerp(set.hero.bx, set.product.bx, t);
    pivot.position.y = lerp(set.hero.by, set.product.by, t);
    pivot.scale.setScalar(lerp(set.hero.scale, set.product.scale, t));

    /* Drag only ever adds to the pose rotation, so releasing the bottle
       leaves it where the reader put it rather than snapping back. */
    spin = damp(spin, spinTo, 0.12, dt);
    pivot.rotation.y = lerp(set.hero.ry, set.product.ry, t) + spin;

    if (!reducedMotion) {
      const time = performance.now() * 0.001;
      pivot.rotation.z = Math.sin(time * 0.32) * 0.011;
      pivot.position.y += Math.sin(time * 0.5) * 0.026;
      curX = damp(curX, pointerX, 0.05, dt);
      curY = damp(curY, pointerY, 0.05, dt);
      pivot.rotation.y += curX * 0.10;
      pivot.rotation.x = -curY * 0.05;
    }
  }

  function render(dt) {
    if (disposed) return;
    if (reducedMotion) {
      if (!dirty) return;
      dirty = false;
    }
    apply(dt);

    renderer.autoClear = false;
    renderer.clear();
    if (water && waterFade > 0.002 && water.ready) {
      water.step(Math.min(dt, 1 / 30));
      water.draw();
      renderer.clearDepth();
    }
    renderer.render(scene, camera);
  }

  resize();

  return {
    resize, render, setPose, setPointer, addSpin,
    push: (x, y, force) => { if (water) water.push(x, y, force); },
    get waterLive() { return !!water && waterFade > 0.002 && water.ready; },
    debug: () => ({
      pose, spin: +spin.toFixed(2), portrait,
      camZ: +camera.position.z.toFixed(2),
      bottle: pivot.position.toArray().map((n) => +n.toFixed(2)),
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      bottle.dispose();
      if (water) water.dispose();
      envRT.dispose();
      scene.environment = null;
      renderer.dispose();
    },
  };
}

return { createScene };
})();
