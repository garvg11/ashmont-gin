window.M["scene/water.js"] = (function () {
/* ============================================================
   The liquid hero.

   Draft 03 rippled a procedural pool. This one ripples the actual
   photograph: the same damped wave equation runs in a ping-pong pair
   of half-float targets, and its gradient displaces the UVs of the
   hero plate before it is sampled. So the water in the picture moves
   when you push it, rather than a synthetic layer moving on top of a
   still image.

   The wave equation is the whole reason it reads as liquid. Pushing
   it produces a spreading front with a trailing wake, not a decaying
   blob, and no amount of noise animation buys that.
   ============================================================ */

const SIM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/* height in .r, velocity in .g. Edges bleed rather than reflect, so
   the pool never rings. */
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

  /* Distance to the segment travelled, so a fast pointer draws a
     continuous wake instead of a dotted line of impacts. */
  float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return distance(p, a + ab * t);
  }

  void main() {
    vec2 d = texture2D(uPrev, vUv).rg;
    float h = d.r, v = d.g;

    float lap =
        texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r
      + texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r
      + texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r
      + texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r
      - 4.0 * h;

    v += lap * 0.22;
    v *= uDamp;
    h += v;

    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    vec2 a = vec2(uPointerPrev.x * uAspect, uPointerPrev.y);
    vec2 b = vec2(uPointer.x * uAspect, uPointer.y);
    h += uStrength * smoothstep(uRadius, 0.0, segDist(p, a, b));

    vec2 e = min(vUv, 1.0 - vUv);
    float edge = smoothstep(0.0, 0.06, min(e.x, e.y));
    h *= mix(0.86, 0.9995, edge);
    v *= mix(0.86, 1.0, edge);

    gl_FragColor = vec4(h, v, 0.0, 1.0);
  }
`;

const VIEW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const VIEW_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uPhoto;
  uniform sampler2D uRipple;
  uniform vec2  uTexel;
  uniform vec2  uCover;   /* object-fit: cover, solved on the CPU */
  uniform vec2  uOffset;
  uniform float uFade;
  uniform float uStrength;
  varying vec2 vUv;

  void main() {
    float h  = texture2D(uRipple, vUv).r;
    float hx = texture2D(uRipple, vUv + vec2(uTexel.x, 0.0)).r
             - texture2D(uRipple, vUv - vec2(uTexel.x, 0.0)).r;
    float hy = texture2D(uRipple, vUv + vec2(0.0, uTexel.y)).r
             - texture2D(uRipple, vUv - vec2(0.0, uTexel.y)).r;
    vec2 grad = vec2(hx, hy);

    /* Refraction through the disturbed surface. The photograph is what
       gets bent, which is why this reads as the water itself moving. */
    vec2 uv = vUv * uCover + uOffset + grad * uStrength;
    vec3 col = texture2D(uPhoto, clamp(uv, 0.001, 0.999)).rgb;

    /* Specular sheet riding the crests, tinted to the brand's cold
       daylight rather than to white. */
    col += vec3(0.80, 0.88, 1.0) * clamp(h * 2.4, -0.25, 0.85) * 0.42;

    gl_FragColor = vec4(col, uFade);
  }
`;

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {object} opts
 * @param {string} opts.src        hero plate to ripple
 * @param {number} opts.size       simulation resolution, power of two
 */
function createWater(renderer, { src, size = 256 } = {}) {
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

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);

  const simScene = new THREE.Scene();
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
    depthTest: false, depthWrite: false,
  });
  const simQuad = new THREE.Mesh(quad, simMat);
  simQuad.frustumCulled = false;
  simScene.add(simQuad);

  /* The plate is decoded off the same file the <img> already fetched,
     so the ripple layer costs no extra download. */
  const photo = new THREE.TextureLoader().load(src, () => { ready = true; });
  photo.colorSpace = THREE.SRGBColorSpace;
  photo.minFilter = THREE.LinearFilter;
  photo.magFilter = THREE.LinearFilter;
  photo.wrapS = photo.wrapT = THREE.ClampToEdgeWrapping;
  let ready = false;

  const viewScene = new THREE.Scene();
  const viewMat = new THREE.ShaderMaterial({
    vertexShader: VIEW_VERT,
    fragmentShader: VIEW_FRAG,
    uniforms: {
      uPhoto: { value: photo },
      uRipple: { value: a.texture },
      uTexel: { value: new THREE.Vector2(1 / size, 1 / size) },
      uCover: { value: new THREE.Vector2(1, 1) },
      uOffset: { value: new THREE.Vector2(0, 0) },
      uFade: { value: 1 },
      uStrength: { value: 0.22 },
    },
    transparent: true,
    depthTest: false, depthWrite: false,
    toneMapped: false,
  });
  const viewQuad = new THREE.Mesh(quad, viewMat);
  viewQuad.frustumCulled = false;
  viewScene.add(viewQuad);

  const pointer = new THREE.Vector2(-9, -9);
  const pointerPrev = new THREE.Vector2(-9, -9);
  let strength = 0;
  let seen = false;
  let nextDrop = 1.4;

  return {
    get ready() { return ready; },

    /** Pointer in 0..1 viewport space, y already flipped for GL. */
    push(x, y, force = 1) {
      if (seen) pointerPrev.set(pointer.x, pointer.y); else pointerPrev.set(x, y);
      pointer.set(x, y);
      seen = true;
      strength = Math.min(strength + force * 0.05, 0.085);
    },

    setFade(v) { viewMat.uniforms.uFade.value = v; },

    /** Solve object-fit: cover for the plate, so it never distorts. */
    resize(vw, vh, photoAspect) {
      simMat.uniforms.uAspect.value = vw / vh;
      const viewAspect = vw / vh;
      let sx = 1, sy = 1;
      if (viewAspect > photoAspect) sy = photoAspect / viewAspect;
      else sx = viewAspect / photoAspect;
      viewMat.uniforms.uCover.value.set(sx, sy);
      viewMat.uniforms.uOffset.value.set((1 - sx) / 2, (1 - sy) / 2);
    },

    /** One simulation step. */
    step(dt) {
      nextDrop -= dt;
      if (nextDrop <= 0) {
        nextDrop = 2.8 + Math.random() * 3.6;
        const x = 0.12 + Math.random() * 0.76;
        const y = 0.12 + Math.random() * 0.76;
        pointerPrev.set(x, y);
        pointer.set(x, y);
        strength = Math.max(strength, 0.045);
      }

      simMat.uniforms.uPrev.value = a.texture;
      simMat.uniforms.uPointer.value.copy(pointer);
      simMat.uniforms.uPointerPrev.value.copy(pointerPrev);
      simMat.uniforms.uStrength.value = strength;

      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(b);
      renderer.render(simScene, cam);
      renderer.setRenderTarget(prev);

      const t = a; a = b; b = t;
      viewMat.uniforms.uRipple.value = a.texture;

      strength *= 0.5;
      if (strength < 1e-4) strength = 0;
      pointerPrev.copy(pointer);
    },

    /** Draw the rippled plate. The caller owns clearing. */
    draw() { renderer.render(viewScene, cam); },

    dispose() {
      a.dispose(); b.dispose();
      quad.dispose();
      simMat.dispose(); viewMat.dispose();
      photo.dispose();
    },
  };
}

return { createWater };
})();
