window.M["scene/scene.js"] = (function () {
/* ============================================================
   The scene.

   It exists for exactly two sections. The bottle is submerged and
   close for the hero, rises and settles beside the copy in the
   surface section, then rides the waterline out of frame as the
   scene drains to daylight and disposes itself.

   Nothing below the handoff pays for a render loop.
   ============================================================ */


const { createBottle } = window.M["scene/bottle.js"];
const { createWater } = window.M["scene/water.js"];
const { clamp, damp, smoothstep } = window.M["core/env.js"];

/* Two poses and a drain. Anything more would be a camera tour, and a
   camera tour is what the brief asked us not to build.

   Portrait is not the landscape framing scaled down. A tall narrow
   frame puts the copy across the full width, so the bottle moves up
   and back and hands the lower half of the screen to the type. */
const POSE = {
  landscape: {
    hero:    { camZ: 6.10, fov: 33, bx: 1.92, by: -0.22, ry: -0.42, scale: 1.30 },
    surface: { camZ: 8.60, fov: 30, bx: 1.52, by:  0.02, ry:  0.26, scale: 0.94 },
  },
  portrait: {
    hero:    { camZ: 11.5, fov: 40, bx: 0.62, by:  1.70, ry: -0.30, scale: 0.82 },
    surface: { camZ: 12.0, fov: 38, bx: 0.40, by:  1.30, ry:  0.20, scale: 0.74 },
  },
};

const lerp = (a, b, t) => a + (b - a) * t;

function createScene(container, { tier = 'high', reducedMotion = false } = {}) {
  const canvas = container.querySelector('canvas');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: tier === 'high',
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  const maxDpr = tier === 'high' ? 2 : tier === 'medium' ? 1.5 : 1.25;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x071a2c, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    POSE.landscape.hero.fov,
    container.clientWidth / container.clientHeight,
    0.1,
    60
  );
  camera.position.set(0, 0, POSE.landscape.hero.camZ);

  /* ---------- Environment ----------
     Underwater the only real light source is the surface, so the map
     is a bright band across the top of a dark sphere. That single
     band is what draws the highlight down each flute. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 256;
  envCanvas.height = 128;
  {
    const ctx = envCanvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.0, '#eaf6ff');
    g.addColorStop(0.22, '#8fc0e8');
    g.addColorStop(0.5, '#1e4d78');
    g.addColorStop(1.0, '#04121f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 6, 256, 10);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, 26, 256, 5);
    ctx.globalAlpha = 1;
  }
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  const envRT = pmrem.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  envTex.dispose();
  pmrem.dispose();

  /* ---------- Water ---------- */
  const water = createWater(renderer, { size: tier === 'high' ? 256 : 128 });

  /* The backdrop sits far enough behind the bottle that the glass has
     something to bend, and is resized on every layout change to cover
     the frustum exactly at that depth. */
  const BACKDROP_Z = -7;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), water.material);
  backdrop.position.z = BACKDROP_Z;
  scene.add(backdrop);

  /* ---------- Light ---------- */
  const key = new THREE.DirectionalLight(0xf2f9ff, 2.6);
  key.position.set(-2.2, 5.4, 3.2);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x74b0e4, 1.5);
  rim.position.set(3.6, 1.2, -3.4);
  scene.add(rim);

  scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x081b2d, 0.7));

  /* ---------- Bottle ---------- */
  const bottle = createBottle({ tier });
  const pivot = new THREE.Group();
  pivot.add(bottle.group);
  scene.add(pivot);

  /* ---------- State ----------
     Pose and drain are separate inputs because they are anchored to
     different things in the document: the pose finishes when the copy
     is centred, the drain runs only while nothing is being read. */
  let pose = 0;
  let drainAmt = 0;
  let dirty = true;
  let pointerX = 0, pointerY = 0;
  let curX = 0, curY = 0;
  let portrait = false;
  let disposed = false;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    portrait = camera.aspect < 0.95;
    water.setAspect(camera.aspect);

    /* Orientation changes the whole pose set, so the framing is
       recomputed here rather than waiting for the next scroll event. */
    dirty = true;
    apply(1 / 60);

    /* Cover the frustum at the backdrop's depth, with a little margin
       so a cursor ripple near the edge never shows the plane's border. */
    const dist = camera.position.z - BACKDROP_Z;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist;
    backdrop.scale.set(height * camera.aspect * 1.12, height * 1.12, 1);
  }

  /** @param {number} p 0 hero framing, 1 settled beside the copy. */
  function setPose(p) { pose = clamp(p, 0, 1); dirty = true; }

  /** @param {number} d 0 submerged, 1 drained to daylight. */
  function setDrain(d) { drainAmt = clamp(d, 0, 1); dirty = true; }

  /** Pointer in -1..1, used for a damped parallax on the bottle only. */
  function setPointer(nx, ny) {
    pointerX = nx;
    pointerY = ny;
  }

  function apply(dt) {
    /* Eased at the edges so a scrub never starts or stops abruptly. */
    const t = smoothstep(0, 1, pose);
    const drain = smoothstep(0, 1, drainAmt);

    const set = portrait ? POSE.portrait : POSE.landscape;
    const camZ = lerp(set.hero.camZ, set.surface.camZ, t);
    const fov = lerp(set.hero.fov, set.surface.fov, t);
    if (Math.abs(camera.fov - fov) > 0.001 || Math.abs(camera.position.z - camZ) > 0.001) {
      camera.position.z = camZ;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      const dist = camera.position.z - BACKDROP_Z;
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * dist;
      backdrop.scale.set(height * camera.aspect * 1.12, height * 1.12, 1);
    }

    pivot.position.x = lerp(set.hero.bx, set.surface.bx, t);
    pivot.position.y = lerp(set.hero.by, set.surface.by, t) - drain * (portrait ? 7.5 : 5.2);
    pivot.rotation.y = lerp(set.hero.ry, set.surface.ry, t);
    pivot.scale.setScalar(lerp(set.hero.scale, set.surface.scale, t));

    water.setSurface(drain);
    water.setCalm(1 - t * 0.5);

    if (!reducedMotion) {
      /* Idle drift. Slow enough to read as buoyancy, not as a spin. */
      const time = performance.now() * 0.001;
      pivot.rotation.z = Math.sin(time * 0.34) * 0.012;
      pivot.position.y += Math.sin(time * 0.52) * 0.028;

      curX = damp(curX, pointerX, 0.06, dt);
      curY = damp(curY, pointerY, 0.06, dt);
      pivot.rotation.y += curX * 0.14;
      pivot.rotation.x = -curY * 0.06;
    }
  }

  function render(dt) {
    if (disposed) return;
    /* Under reduced motion the scene is a still image that happens to
       track the scroll. It redraws when something actually changed and
       is otherwise free. */
    if (reducedMotion) {
      if (!dirty) return;
      dirty = false;
      apply(dt);
      renderer.render(scene, camera);
      return;
    }
    water.step(Math.min(dt, 1 / 30));
    apply(dt);
    renderer.render(scene, camera);
  }

  resize();

  return {
    resize,
    render,
    setPose,
    setDrain,
    setPointer,
    /** Pointer in 0..1 viewport space, y flipped for GL. */
    push: (x, y, force) => water.push(x, y, force),
    debug: () => ({
      pose,
      drain: drainAmt,
      surface: water.material.uniforms.uSurface.value,
      camZ: camera.position.z,
      bottle: pivot.position.toArray().map((n) => +n.toFixed(2)),
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      bottle.dispose();
      backdrop.geometry.dispose();
      water.dispose();
      envRT.dispose();
      scene.environment = null;
      renderer.dispose();
    },
  };
}

return { createScene };
})();
