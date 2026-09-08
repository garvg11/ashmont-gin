window.M["scene/water.js"] = (function () {
/* ============================================================
   The water.

   Two pieces. A ripple simulation running in a ping-pong pair of
   half-float targets, and a backdrop plane that reads that height
   field to distort a procedural caustic net.

   The simulation is a damped wave equation, which is the cheapest
   thing that still behaves like a liquid: pushing it produces a
   spreading front with a trailing wake, not a decaying blob. That
   difference is the entire reason the cursor feels like water.
   ============================================================ */



const SIM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* height in .r, velocity in .g. Edges are damped rather than reflected,
   so energy leaves the frame instead of standing in it. */
const SIM_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uPrev;
  uniform vec2  uTexel;
  uniform vec2  uPointer;
  uniform vec2  uPointerPrev;
  uniform float uStrength;
  uniform float uRadius;
  uniform float uAspect;
  uniform float uDamp;
  varying vec2 vUv;

  /* Distance from p to the segment ab, so a fast pointer draws a
     continuous wake instead of a dotted line of impacts. */
  float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return distance(p, a + ab * t);
  }

  void main() {
    vec2 d = texture2D(uPrev, vUv).rg;
    float h = d.r;
    float v = d.g;

    float lap =
        texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r
      + texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r
      + texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r
      + texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r
      - 4.0 * h;

    v += lap * 0.22;
    v *= uDamp;
    h += v;

    vec2 p  = vec2(vUv.x * uAspect, vUv.y);
    vec2 a  = vec2(uPointerPrev.x * uAspect, uPointerPrev.y);
    vec2 b  = vec2(uPointer.x * uAspect, uPointer.y);
    h += uStrength * smoothstep(uRadius, 0.0, segDist(p, a, b));

    /* Bleed off at the border so the pool never rings. */
    vec2 e = min(vUv, 1.0 - vUv);
    float edge = smoothstep(0.0, 0.06, min(e.x, e.y));
    h *= mix(0.86, 0.9995, edge);
    v *= mix(0.86, 1.0, edge);

    gl_FragColor = vec4(h, v, 0.0, 1.0);
  }
`;

const WATER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* The caustic net is built rather than sampled: two counter-rotating
   wave fronts, ridged so their crests become filaments, layered three
   times at different scales. It costs a few dozen instructions and it
   never has to be downloaded. */
const WATER_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uRipple;
  uniform vec2  uTexel;
  uniform float uTime;
  uniform float uAspect;
  uniform float uSurface;   /* 0 fully submerged, 1 fully drained */
  uniform float uCalm;      /* 1 hero, 0 as the scene hands off */
  uniform vec3  uAbyss;
  uniform vec3  uMarine;
  uniform vec3  uWater;
  uniform vec3  uHaze;
  uniform vec3  uCaustic;
  uniform vec3  uAir;
  varying vec2 vUv;

  float ridge(float x) { return 1.0 - abs(x); }

  mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

  /* Two counter-rotating wave fronts, ridged so their crests become
     filaments rather than bands. The frequency has to be high enough
     that a frame holds several cells, or the ridges read as fog. */
  float causticLayer(vec2 p, float t, float scale) {
    p *= scale;
    float a = sin(p.x * 3.1 + t * 0.70) + sin(p.y * 2.7 - t * 0.55);
    float b = sin((p.x + p.y) * 2.3 + t * 0.42) + sin((p.x - p.y) * 2.9 - t * 0.61);
    /* A third front on an incommensurable angle. Without it the two
       axes beat against each other on a regular lattice and the field
       reads as wallpaper rather than as light. */
    float d = sin(p.x * 1.73 - p.y * 2.21 + t * 0.31);
    float f = ridge(a * 0.5) * ridge(b * 0.5) * mix(0.42, 1.0, 0.5 + 0.5 * d);
    return pow(clamp(f, 0.0, 1.0), 6.0);
  }

  void main() {
    vec2 uv = vUv;

    float h  = texture2D(uRipple, uv).r;
    float hx = texture2D(uRipple, uv + vec2(uTexel.x, 0.0)).r - texture2D(uRipple, uv - vec2(uTexel.x, 0.0)).r;
    float hy = texture2D(uRipple, uv + vec2(0.0, uTexel.y)).r - texture2D(uRipple, uv - vec2(0.0, uTexel.y)).r;
    vec2  grad = vec2(hx, hy);

    /* Light refracts through the disturbed surface before it reaches
       the caustic plane, so the net is displaced by the gradient. */
    vec2 p = vec2(uv.x * uAspect, uv.y) + grad * 2.4;

    /* Each octave is rotated and offset so no two share a lattice. */
    float c =
        causticLayer(rot(0.31) * p + vec2(0.0, 0.0),   uTime,        4.30) * 0.54
      + causticLayer(rot(2.14) * p + vec2(13.7, 4.3),  uTime * 0.83, 7.60) * 0.31
      + causticLayer(rot(-1.27) * p + vec2(31.2, 9.1), uTime * 1.31, 13.4) * 0.15;
    c = pow(c, 1.25) * 1.5;

    /* Depth. Light arrives from above, so the top of frame is where
       the surface is and the bottom is where it stops reaching. */
    float depth = smoothstep(-0.25, 1.15, uv.y);
    vec3 body = mix(uAbyss, uMarine, smoothstep(0.0, 0.72, depth));
    body = mix(body, uWater, pow(depth, 1.7) * 0.92);
    body = mix(body, uHaze, pow(depth, 5.0) * 0.55);

    /* Shafts. Wide, soft, only in the upper half. */
    float shaft = pow(max(sin(uv.x * 7.3 + sin(uv.y * 2.1 + uTime * 0.14) * 1.6), 0.0), 9.0);
    shaft *= smoothstep(0.0, 0.85, uv.y) * 0.30;

    /* One broad pool of light where the surface is brightest. Glass
       needs something behind it to bend, and a flat field gives the
       transmission pass nothing to work with. */
    float bloom = exp(-length((uv - vec2(0.56, 0.98)) * vec2(1.15, 1.9)) * 2.3);

    /* Composition. The light belongs to the object, not to the copy:
       in landscape the left third is pulled down so the headline has a
       quiet ground, and in portrait the same falloff runs bottom-up
       because that is where the copy moves to. */
    float quiet = uAspect > 0.95
      ? smoothstep(0.02, 0.64, uv.x)
      : smoothstep(0.04, 0.72, uv.y);

    float caust = c * mix(0.30, 1.0, depth) * mix(0.55, 1.0, uCalm) * mix(0.12, 1.0, quiet);
    shaft *= mix(0.30, 1.0, quiet);

    vec3 col = body + uCaustic * caust * 1.75 + uCaustic * shaft + uCaustic * bloom * 0.26;

    /* The ripple itself reads as a specular sheet on top of the net. */
    col += uCaustic * clamp(h * 2.4, -0.22, 0.7) * 0.45 * mix(0.35, 1.0, quiet);

    col *= mix(0.36, 1.0, quiet);

    /* Draining. The waterline crosses the frame and everything above
       it becomes flat daylight, which is the page's own ground colour
       so the canvas can hand off without a visible seam. */
    float line = mix(1.42, -0.42, uSurface) + h * 0.05 + sin(uv.x * 9.0 + uTime * 0.6) * 0.006;
    float air  = smoothstep(line - 0.010, line + 0.010, uv.y);
    float glint = exp(-pow((uv.y - line) * 46.0, 2.0));
    col = mix(col, uAir, air);
    col += uCaustic * glint * 0.5 * (1.0 - air * 0.4);

    /* Vignette, tinted to the ground rather than to black. */
    vec2 q = (uv - 0.5) * vec2(uAspect / max(uAspect, 1.0), 1.0);
    col *= 1.0 - smoothstep(0.35, 0.95, length(q)) * 0.34 * (1.0 - air);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {object} opts
 * @param {number} opts.size simulation resolution, power of two
 */
function createWater(renderer, { size = 256 } = {}) {
  const rtOpts = {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  };

  let a = new THREE.WebGLRenderTarget(size, size, rtOpts);
  let b = new THREE.WebGLRenderTarget(size, size, rtOpts);

  const simScene = new THREE.Scene();
  const simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const simMat = new THREE.ShaderMaterial({
    vertexShader: SIM_VERT,
    fragmentShader: SIM_FRAG,
    uniforms: {
      uPrev: { value: a.texture },
      uTexel: { value: new THREE.Vector2(1 / size, 1 / size) },
      uPointer: { value: new THREE.Vector2(-9, -9) },
      uPointerPrev: { value: new THREE.Vector2(-9, -9) },
      uStrength: { value: 0 },
      uRadius: { value: 0.055 },
      uAspect: { value: 1 },
      uDamp: { value: 0.982 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat);
  simQuad.frustumCulled = false;
  simScene.add(simQuad);

  /* A raw ShaderMaterial gets no colour-space chunk appended, so what
     the fragment writes is what the sRGB framebuffer keeps. Feeding it
     the token values straight is what lets the drained water match
     --surface exactly and hand off to the page with no seam. */
  const toLinear = (hex) => new THREE.Color(hex);

  const waterMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms: {
      uRipple: { value: a.texture },
      uTexel: { value: new THREE.Vector2(1 / size, 1 / size) },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uSurface: { value: 0 },
      uCalm: { value: 1 },
      uAbyss: { value: toLinear(0x071a2c) },
      uMarine: { value: toLinear(0x123a5e) },
      uWater: { value: toLinear(0x3d6e96) },
      uHaze: { value: toLinear(0xa9c5dd) },
      uCaustic: { value: toLinear(0xfbfdff) },
      uAir: { value: toLinear(0xe4eef7) },
    },
    fog: false,
    toneMapped: false,
  });

  /* Pointer state. Strength decays every frame so a stationary cursor
     stops pumping energy into the pool. */
  const pointer = new THREE.Vector2(-9, -9);
  const pointerPrev = new THREE.Vector2(-9, -9);
  let strength = 0;
  let hasPointer = false;

  /* One idle drop every few seconds keeps the field alive without a
     looping animation, and gives an untouched hero something to do. */
  let nextDrop = 1.2;

  return {
    material: waterMat,

    /** Pointer in 0..1 viewport space, y already flipped to GL. */
    push(x, y, force = 1) {
      if (hasPointer) pointerPrev.set(pointer.x, pointer.y);
      else pointerPrev.set(x, y);
      pointer.set(x, y);
      hasPointer = true;
      strength = Math.min(strength + force * 0.05, 0.085);
    },

    setAspect(aspect) {
      simMat.uniforms.uAspect.value = aspect;
      waterMat.uniforms.uAspect.value = aspect;
    },

    /** 0 fully submerged, 1 fully drained. */
    setSurface(v) {
      waterMat.uniforms.uSurface.value = v;
    },

    setCalm(v) {
      waterMat.uniforms.uCalm.value = v;
    },

    /** One simulation step plus one caustic time step. */
    step(dt) {
      waterMat.uniforms.uTime.value += dt;

      nextDrop -= dt;
      if (nextDrop <= 0) {
        nextDrop = 2.6 + Math.random() * 3.4;
        const x = 0.12 + Math.random() * 0.76;
        const y = 0.12 + Math.random() * 0.76;
        pointerPrev.set(x, y);
        pointer.set(x, y);
        strength = Math.max(strength, 0.05);
      }

      simMat.uniforms.uPrev.value = a.texture;
      simMat.uniforms.uPointer.value.copy(pointer);
      simMat.uniforms.uPointerPrev.value.copy(pointerPrev);
      simMat.uniforms.uStrength.value = strength;

      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(b);
      renderer.render(simScene, simCam);
      renderer.setRenderTarget(prevTarget);

      const t = a; a = b; b = t;
      waterMat.uniforms.uRipple.value = a.texture;

      strength *= 0.5;
      if (strength < 1e-4) strength = 0;
      pointerPrev.copy(pointer);
    },

    dispose() {
      a.dispose();
      b.dispose();
      simQuad.geometry.dispose();
      simMat.dispose();
      waterMat.dispose();
    },
  };
}

return { createWater };
})();
