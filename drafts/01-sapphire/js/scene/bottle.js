window.M["scene/bottle.js"] = (function () {
/* ============================================================
   DRAFT 1 - the sapphire concept.

   The Ashmont bottle as a lathe-turned solid of revolution: deep
   sapphire glass, blued-steel collar, engraved label. Superseded by
   draft 2, which matches the real bottle (fluted pale glass, wood cap,
   navy and gold label). Kept as a reference for the cold-minimal
   direction.
   ============================================================ */



/* Profile of the bottle, from the centre of the punt up to the lip.
   x = radius, y = height. The bottle is about 2.7 units tall. */
const PROFILE = [
  [0.0, 0.2],
  [0.14, 0.15],
  [0.28, 0.08],
  [0.4, 0.02],
  [0.48, 0.0],
  [0.52, 0.04],
  [0.535, 0.12],
  [0.54, 0.3],
  [0.54, 1.28],
  [0.535, 1.44],
  [0.515, 1.58],
  [0.47, 1.73],
  [0.4, 1.86],
  [0.32, 1.96],
  [0.24, 2.04],
  [0.195, 2.12],
  [0.178, 2.22],
  [0.175, 2.4],
  [0.178, 2.5],
  [0.2, 2.56],
  [0.212, 2.62],
  [0.208, 2.68],
  [0.17, 2.7],
  [0.0, 2.71],
];

/** Centripetal Catmull-Rom through the profile so the silhouette has no facets. */
function smoothProfile(points, subdivisions = 6) {
  const pts = points.map(([x, y]) => new THREE.Vector2(x, y));
  const out = [];
  const p = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        new THREE.Vector2(
          0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        )
      );
    }
  }
  out.push(pts[pts.length - 1].clone());
  // Radius must never go negative or the lathe folds through itself.
  return out.map((v) => new THREE.Vector2(Math.max(v.x, 0), v.y));
}

/** The engraved label, drawn to a canvas so it uses the real brand type. */
function labelTexture(theme) {
  const w = 1024;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const ink = theme === 'light' ? '#0a1220' : '#e6e9f0';
  ctx.clearRect(0, 0, w, h);

  // Hairline frame, the engraved-plate reference
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 54, w - 128, h - 108);
  ctx.globalAlpha = 1;

  const tracked = (text, y, font, spacing, alpha) => {
    ctx.font = font;
    ctx.fillStyle = ink;
    ctx.globalAlpha = alpha;
    const widths = [...text].map((ch) => ctx.measureText(ch).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    let x = (w - total) / 2;
    [...text].forEach((ch, i) => {
      ctx.fillText(ch, x, y);
      x += widths[i];
    });
    ctx.globalAlpha = 1;
  };

  tracked('ASHMONT', 300, '400 156px "Bodoni Moda", Didot, Georgia, serif', 14, 1);
  tracked('LONDON DRY GIN', 372, '500 34px "IBM Plex Mono", monospace', 12, 0.72);

  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(300, 420);
  ctx.lineTo(w - 300, 420);
  ctx.stroke();
  ctx.globalAlpha = 1;

  tracked('45.2% ABV', 484, '500 30px "IBM Plex Mono", monospace', 8, 0.62);
  tracked('50 CL', 528, '500 30px "IBM Plex Mono", monospace', 8, 0.62);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Build the bottle group.
 * @param {object} opts
 * @param {'high'|'medium'|'low'} opts.tier
 * @param {'dark'|'light'} opts.theme
 */
function createBottle({ tier = 'high', theme = 'dark' } = {}) {
  const group = new THREE.Group();
  const radial = tier === 'high' ? 128 : tier === 'medium' ? 72 : 48;
  const subdiv = tier === 'high' ? 7 : 4;

  const profile = smoothProfile(PROFILE, subdiv);
  const glassGeo = new THREE.LatheGeometry(profile, radial);
  glassGeo.computeVertexNormals();

  const sapphire = new THREE.Color(0x2554d8);
  const deep = new THREE.Color(0x0b2a6b);

  let glassMat;
  if (tier === 'high') {
    // Real refraction. The blue is attenuation through thickness, which is
    // why the shoulders read lighter than the body.
    glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.04,
      transmission: 1,
      thickness: 0.95,
      ior: 1.52,
      attenuationColor: sapphire,
      attenuationDistance: 0.95,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.1,
      specularIntensity: 1,
    });
  } else {
    // No transmission pass on weaker hardware. Tinted, glossy, still glass.
    glassMat = new THREE.MeshPhysicalMaterial({
      color: deep,
      metalness: 0.05,
      roughness: 0.12,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 2.1,
      depthWrite: false,
    });
  }

  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.name = 'glass';
  group.add(glass);

  /* Fresnel edge pass. A shell a fraction larger than the glass, lit only
     where the surface turns away from the camera. This is the bright wet
     line down the silhouette that separates glass from painted plastic. */
  const rimMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(theme === 'light' ? 0x4f79d8 : 0x9dc0ff) },
      uPower: { value: 3.1 },
      uStrength: { value: theme === 'light' ? 0.4 : 0.85 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uStrength;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), uPower);
        gl_FragColor = vec4(uColor, f * uStrength);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const rimShell = new THREE.Mesh(glassGeo, rimMat);
  rimShell.scale.setScalar(1.008);
  rimShell.name = 'rim';
  group.add(rimShell);

  // Interior liquid. Slightly inset, filled to just under the shoulder.
  const liquidProfile = profile
    .filter((v) => v.y <= 1.62)
    .map((v) => new THREE.Vector2(Math.max(v.x - 0.045, 0), v.y));
  liquidProfile.push(new THREE.Vector2(0, 1.62));

  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xdfe9ff,
    metalness: 0,
    roughness: 0.02,
    transmission: tier === 'high' ? 0.94 : 0,
    thickness: 0.5,
    ior: 1.34,
    attenuationColor: new THREE.Color(0x8fb4ff),
    attenuationDistance: 1.6,
    transparent: tier !== 'high',
    opacity: tier === 'high' ? 1 : 0.4,
    envMapIntensity: 1.2,
    depthWrite: false,
  });
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(liquidProfile, radial), liquidMat);
  liquid.name = 'liquid';
  group.add(liquid);

  // Blued steel collar and stopper. Cold metal, deliberately not brass.
  const metal = new THREE.MeshStandardMaterial({
    color: 0x111a2b,
    metalness: 0.92,
    roughness: 0.34,
    envMapIntensity: 1.3,
  });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.222, 0.216, 0.2, radial / 2), metal);
  collar.position.y = 2.62;
  group.add(collar);

  const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.2, 0.14, radial / 2), metal);
  stopper.position.y = 2.77;
  group.add(stopper);

  // Curved label wrapped onto the body.
  const labelTex = labelTexture(theme);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    // Emissive keeps the engraving legible wherever the camera is, rather
    // than letting it fall into shadow on the unlit side of the bottle.
    emissive: new THREE.Color(theme === 'light' ? 0x0a1220 : 0xb9c8e6),
    emissiveMap: labelTex,
    emissiveIntensity: theme === 'light' ? 0.25 : 0.62,
    transparent: true,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.5,
  });
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.552, 0.552, 0.72, 96, 1, true, -1.15, 2.3),
    labelMat
  );
  label.position.y = 0.92;
  label.name = 'label';
  group.add(label);

  group.position.y = -1.35; // sit the bottle's mass around the origin

  return {
    group,
    label,
    setTheme(next) {
      if (labelMat.map) labelMat.map.dispose();
      const tex = labelTexture(next);
      labelMat.map = tex;
      labelMat.emissiveMap = tex;
      labelMat.emissive.set(next === 'light' ? 0x0a1220 : 0xb9c8e6);
      labelMat.emissiveIntensity = next === 'light' ? 0.25 : 0.62;
      labelMat.needsUpdate = true;
      rimMat.uniforms.uColor.value.set(next === 'light' ? 0x4f79d8 : 0x9dc0ff);
      rimMat.uniforms.uStrength.value = next === 'light' ? 0.4 : 0.85;
    },
    dispose() {
      [glassGeo, liquid.geometry, collar.geometry, stopper.geometry, label.geometry].forEach((g) =>
        g.dispose()
      );
      rimMat.dispose();
      [glassMat, liquidMat, metal, labelMat].forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    },
  };
}

return { createBottle };
})();
