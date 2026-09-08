/* ============================================================
   The Ashmont Gin bottle.

   Built to match the real bottle: pale ice-blue fluted glass, a squat
   wide body, a natural wood cap, a navy neck band with red pinstripes,
   and a navy label with a gold frame and a claret banner.

   Lathe-turned and then fluted by modulating radius against angle, so
   the whole thing is a few kilobytes of maths rather than a model
   download, and the proportions stay editable.
   ============================================================ */

import * as THREE from '../../vendor/three.module.min.js';

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

   Direction 03 reads the label off the reference frame: a pale paper
   field with navy type, an engraved monogram, and nothing else. No
   crest, no banner, no gold. The bottle is the only place --cork
   appears, and the label is the only place the paper white does. */

const NAVY = '#0d2440';
const NAVY_SOFT = '#2b4a6d';
const PAPER = '#f4f1e9';
const PAPER_EDGE = '#e2ddd0';

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

/** The monogram: a serif A under a small lozenge, the same mark as the nav. */
function monogram(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = NAVY;
  ctx.save();
  ctx.translate(0, -size * 0.86);
  ctx.rotate(Math.PI / 4);
  const d = size * 0.1;
  ctx.fillRect(-d / 2, -d / 2, d, d);
  ctx.restore();

  ctx.font = `300 ${size}px "Fraunces", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('A', 0, size * 0.36);
  ctx.textAlign = 'left';
  ctx.restore();
}

/** The main body label: paper field, hairline frame, navy type. */
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

  // Single hairline frame. One rule, not two.
  ctx.strokeStyle = NAVY;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 40, w - 88, h - 80);
  ctx.globalAlpha = 1;

  monogram(ctx, cx, 214, 132);

  tracked(ctx, 'ASHMONT', cx, 470, '300 152px "Fraunces", Georgia, serif', 12, NAVY);

  ctx.strokeStyle = NAVY;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 250, 528);
  ctx.lineTo(cx + 250, 528);
  ctx.stroke();
  ctx.globalAlpha = 1;

  tracked(ctx, 'LONDON DRY GIN', cx, 604, '500 40px "Instrument Sans", system-ui, sans-serif', 14, NAVY_SOFT);
  tracked(ctx, 'POLAND', cx, 726, '500 30px "IBM Plex Mono", monospace', 12, NAVY_SOFT, 0.8);

  tracked(ctx, '45.2% ABV', cx - 300, 812, '400 26px "IBM Plex Mono", monospace', 4, NAVY_SOFT, 0.72);
  tracked(ctx, '50 CL', cx + 300, 812, '400 26px "IBM Plex Mono", monospace', 4, NAVY_SOFT, 0.72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}


export function createBottle({ tier = 'high' } = {}) {
  const group = new THREE.Group();

  const radial = tier === 'high' ? 288 : tier === 'medium' ? 144 : 72;
  const subdiv = tier === 'high' ? 5 : 3;
  const canFlute = tier !== 'low';

  const profile = smoothProfile(PROFILE, subdiv);
  const glassGeo = new THREE.LatheGeometry(profile, radial);
  if (canFlute) fluteGeometry(glassGeo);
  else glassGeo.computeVertexNormals();

  /* Direction 03 sits the bottle in water rather than in fog, so the
     glass is tinted deeper and the attenuation is shorter. The flutes
     then read as bands of blue rather than as pale highlights. */
  const glassTint = new THREE.Color(0x2f6ea8);

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
      attenuationDistance: 0.62,
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

  /* Natural wood cap. Warm, matte, lightly grained. */
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xc9a980,
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.7,
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
