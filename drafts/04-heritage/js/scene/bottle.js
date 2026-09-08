window.M["scene/bottle.js"] = (function () {
/* ============================================================
   The Ashmont Gin bottle.

   Built to match the real bottle: pale ice-blue fluted glass, a squat
   wide body, a natural wood cap, a navy neck band with red pinstripes,
   and a navy label with a gold frame and a claret banner.

   Lathe-turned and then fluted by modulating radius against angle, so
   the whole thing is a few kilobytes of maths rather than a model
   download, and the proportions stay editable.
   ============================================================ */



/* Profile from the centre of the punt up to the lip.
   x = radius, y = height. The bottle stands 2.61 units tall and is
   deliberately squat: the real one is wide in the body with a short neck. */
const PROFILE = [
  [0.0, 0.15],
  [0.18, 0.11],
  [0.36, 0.045],
  [0.52, 0.008],
  [0.6, 0.03],
  [0.625, 0.1],
  [0.632, 0.2],
  [0.634, 0.9],
  [0.632, 1.42],
  [0.625, 1.6],
  [0.606, 1.73],
  [0.57, 1.85],
  [0.5, 1.97],
  [0.42, 2.05],
  [0.35, 2.11],
  [0.3, 2.16],
  [0.283, 2.22],
  [0.278, 2.32],
  [0.278, 2.46],
  [0.284, 2.52],
  [0.298, 2.56],
  [0.294, 2.6],
  [0.21, 2.62],
  [0.0, 2.63],
];

/* Fluting. The ribs run the body only, fading in above the heel and out
   below the shoulder, exactly as they do on the glass. */
const RIBS = 40;
const RIB_DEPTH = 0.016;
const RIB_FROM = 0.22;
const RIB_TO = 1.5;

const smooth = (e0, e1, x) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

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
  return out.map((v) => new THREE.Vector2(Math.max(v.x, 0), v.y));
}

/** Push each ring of vertices in and out around its axis to cut the flutes. */
function fluteGeometry(geo, depth = RIB_DEPTH) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.05) continue;

    const fade = smooth(RIB_FROM, RIB_FROM + 0.1, y) * (1 - smooth(RIB_TO - 0.12, RIB_TO, y));
    if (fade <= 0) continue;

    const theta = Math.atan2(z, x);
    const rib = 0.5 + 0.5 * Math.cos(theta * RIBS);
    const nr = r + depth * fade * rib;
    pos.setX(i, Math.cos(theta) * nr);
    pos.setZ(i, Math.sin(theta) * nr);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ---------- Label artwork, drawn to canvas so it uses the brand type ----------

   Direction 04 reads the label off the comp: cream paper, navy type,
   a brass rule and a small heraldic crest. The cap is the only place
   --gold appears in three dimensions, the label the only place the
   paper cream does. */

const NAVY = '#0d2440';
const NAVY_SOFT = '#2b4a6d';
const PAPER = '#f4f1e9';
const PAPER_EDGE = '#e6ded0';
const GOLD = '#b8955f';

function tracked(ctx, text, cx, y, font, spacing, color, alpha = 1) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  const widths = [...text].map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i];
  });
  ctx.globalAlpha = 1;
}

/** A small heraldic mark: a serif A inside a laurel oval. Drawn rather
    than downloaded, so the label stays a few kilobytes of maths. */
function crest(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 42, 56, 0, 0, Math.PI * 2);
  ctx.stroke();

  // laurel ticks around the oval
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r1 = 46, r2 = 53;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r2 * 0.92);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }

  ctx.fillStyle = NAVY;
  ctx.font = '400 62px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('A', 0, 22);
  ctx.textAlign = 'left';
  ctx.restore();
}

/** The main body label: cream paper, navy type, brass rules. */
function labelTexture() {
  const w = 1400;
  const h = 900;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const cx = w / 2;

  const paper = ctx.createLinearGradient(0, 0, 0, h);
  paper.addColorStop(0, PAPER);
  paper.addColorStop(1, PAPER_EDGE);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  tracked(ctx, 'CRAFTED IN POLAND', cx, 118, '500 27px "Jost", system-ui, sans-serif', 11, NAVY_SOFT, 0.8);

  tracked(ctx, 'ASHMONT', cx, 300, '400 168px "Playfair Display", Georgia, serif', 10, NAVY);

  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 250, 348);
  ctx.lineTo(cx + 250, 348);
  ctx.stroke();
  ctx.globalAlpha = 1;

  tracked(ctx, 'LONDON DRY GIN', cx, 410, '500 36px "Jost", system-ui, sans-serif', 13, NAVY_SOFT);

  crest(ctx, cx, 560, 1.55);

  tracked(ctx, '16 BOTANICALS', cx, 700, '500 28px "Jost", system-ui, sans-serif', 10, NAVY_SOFT, 0.9);

  ctx.strokeStyle = NAVY;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 300, 752);
  ctx.lineTo(cx + 300, 752);
  ctx.stroke();
  ctx.globalAlpha = 1;

  tracked(ctx, '700 ml', cx - 150, 812, '400 30px "Jost", system-ui, sans-serif', 5, NAVY_SOFT, 0.85);
  tracked(ctx, '43% ABV', cx + 150, 812, '400 30px "Jost", system-ui, sans-serif', 5, NAVY_SOFT, 0.85);
  ctx.fillStyle = NAVY_SOFT;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(cx - 1, 792, 2, 26);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createBottle({ tier = 'high' } = {}) {
  const group = new THREE.Group();

  const radial = tier === 'high' ? 288 : tier === 'medium' ? 144 : 72;
  const subdiv = tier === 'high' ? 5 : 3;
  const canFlute = tier !== 'low';

  const profile = smoothProfile(PROFILE, subdiv);
  const glassGeo = new THREE.LatheGeometry(profile, radial);
  if (canFlute) fluteGeometry(glassGeo);
  else glassGeo.computeVertexNormals();

  /* Direction 04 matches the comp's bottle: a saturated cobalt, deeper
     than draft 03's water blue, with the attenuation short enough that
     the flutes read as ribs of solid colour. */
  const glassTint = new THREE.Color(0x1b46a4);

  let glassMat;
  if (tier === 'high') {
    glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xeaf4ff,
      metalness: 0,
      roughness: 0.035,
      transmission: 1,
      thickness: 0.62,
      ior: 1.52,
      attenuationColor: glassTint,
      attenuationDistance: 0.42,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 2.2,
      specularIntensity: 1,
    });
  } else {
    glassMat = new THREE.MeshPhysicalMaterial({
      color: glassTint,
      metalness: 0.05,
      roughness: 0.1,
      transparent: true,
      opacity: 0.58,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 2.4,
      depthWrite: false,
    });
  }

  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.name = 'glass';
  group.add(glass);

  /* Fresnel edge pass. On fluted glass this is what makes each rib
     catch its own highlight down the silhouette. */
  const rimMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xdcecff) },
      uPower: { value: 2.7 },
      uStrength: { value: 0.5 },
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
  });
  const rimShell = new THREE.Mesh(glassGeo, rimMat);
  rimShell.scale.setScalar(1.004);
  group.add(rimShell);

  /* Spirit inside. Clear, filled to just under the shoulder. */
  const liquidProfile = profile
    .filter((v) => v.y <= 1.66)
    .map((v) => new THREE.Vector2(Math.max(v.x - 0.035, 0), v.y));
  liquidProfile.push(new THREE.Vector2(0, 1.66));

  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xf2f8ff,
    metalness: 0,
    roughness: 0.02,
    transmission: tier === 'high' ? 0.96 : 0,
    thickness: 0.35,
    ior: 1.33,
    attenuationColor: new THREE.Color(0xcfe4fb),
    attenuationDistance: 3.4,
    transparent: tier !== 'high',
    opacity: tier === 'high' ? 1 : 0.3,
    envMapIntensity: 1.2,
    depthWrite: false,
  });
  const liquid = new THREE.Mesh(
    new THREE.LatheGeometry(liquidProfile, Math.min(radial, 128)),
    liquidMat
  );
  group.add(liquid);

  /* Polished brass cap, as the comp has it. The only warm metal on the
     object, and the only place --gold appears in three dimensions. */
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xb8955f,
    metalness: 0.85,
    roughness: 0.28,
    envMapIntensity: 1.4,
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.293, 0.26, 96), woodMat);
  cap.position.y = 2.72;
  group.add(cap);

  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 96), woodMat);
  capTop.position.y = 2.86;
  group.add(capTop);

  /* No neck band in this direction. The reference bottle leaves the
     neck as bare fluted glass, and it is the only place the water
     shows straight through the object. */

  /* The body label, wrapped around the front of the flutes. */
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTexture(),
    roughness: 0.78,
    metalness: 0.06,
    side: THREE.DoubleSide,
    envMapIntensity: 0.55,
  });
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.652, 0.652, 0.7, 160, 1, true, -1.3, 2.6),
    labelMat
  );
  label.position.y = 0.9;
  label.name = 'label';
  group.add(label);

  group.position.y = -1.32;

  return {
    group,
    dispose() {
      [glassGeo, liquid.geometry, cap.geometry, capTop.geometry, label.geometry].forEach(
        (g) => g.dispose()
      );
      rimMat.dispose();
      [glassMat, liquidMat, woodMat, labelMat].forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    },
  };
}

return { createBottle };
})();
