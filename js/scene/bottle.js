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

/* ---------- Label artwork, drawn to canvas so it uses the brand type ---------- */

const NAVY = '#101f3d';
const GOLD = '#c9a227';
const GOLD_SOFT = '#e0c169';
const CLARET = '#9c2028';
const CREAM = '#f2ecdd';

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

/** The heraldic crest: a shield under a spread eagle, drawn small and gold. */
function crest(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = GOLD;

  // spread wings
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.quadraticCurveTo(-16, -20, -30, -12);
  ctx.quadraticCurveTo(-18, -8, -13, -1);
  ctx.quadraticCurveTo(-20, -3, -26, 2);
  ctx.quadraticCurveTo(-14, 3, -7, 5);
  ctx.lineTo(0, 2);
  ctx.lineTo(7, 5);
  ctx.quadraticCurveTo(14, 3, 26, 2);
  ctx.quadraticCurveTo(20, -3, 13, -1);
  ctx.quadraticCurveTo(18, -8, 30, -12);
  ctx.quadraticCurveTo(16, -20, 0, -13);
  ctx.fill();

  // head
  ctx.beginPath();
  ctx.arc(0, -17, 5, 0, Math.PI * 2);
  ctx.fill();

  // shield
  ctx.beginPath();
  ctx.moveTo(-11, 4);
  ctx.lineTo(11, 4);
  ctx.lineTo(11, 16);
  ctx.quadraticCurveTo(0, 28, -11, 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(-7, 7);
  ctx.lineTo(7, 7);
  ctx.lineTo(7, 15);
  ctx.quadraticCurveTo(0, 23, -7, 15);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** The main body label: navy field, gold frame, crest, claret banner. */
function labelTexture() {
  const w = 1400;
  const h = 900;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const cx = w / 2;

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);

  // Gold frame, double rule
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 7;
  ctx.strokeRect(30, 26, w - 60, h - 52);
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.85;
  ctx.strokeRect(48, 44, w - 96, h - 88);
  ctx.globalAlpha = 1;

  crest(ctx, cx, 150, 2.15);

  tracked(ctx, 'ESTD', cx - 210, 226, '500 30px "IBM Plex Mono", monospace', 7, GOLD_SOFT, 0.95);
  tracked(ctx, '1874', cx + 210, 226, '500 30px "IBM Plex Mono", monospace', 7, GOLD_SOFT, 0.95);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(cx - 120, 218, 4, 0, Math.PI * 2);
  ctx.arc(cx + 120, 218, 4, 0, Math.PI * 2);
  ctx.fill();

  tracked(ctx, 'ASHMONT GIN', cx, 400, '400 138px "Bodoni Moda", Didot, Georgia, serif', 8, CREAM);

  // Claret banner
  const by = 470;
  const bh = 74;
  ctx.fillStyle = CLARET;
  ctx.beginPath();
  ctx.moveTo(120, by);
  ctx.lineTo(w - 120, by);
  ctx.lineTo(w - 158, by + bh / 2);
  ctx.lineTo(w - 120, by + bh);
  ctx.lineTo(120, by + bh);
  ctx.lineTo(158, by + bh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  tracked(ctx, 'SUPER PREMIUM GIN', cx, by + 49, '500 34px "IBM Plex Mono", monospace', 10, CREAM);

  ctx.globalAlpha = 0.72;
  tracked(ctx, 'PREMIUM CLASSIC GIN HANDCRAFTED', cx, 640, '500 25px "IBM Plex Mono", monospace', 5, GOLD_SOFT);
  tracked(ctx, 'WITH SELECT BOTANICALS', cx, 678, '500 25px "IBM Plex Mono", monospace', 5, GOLD_SOFT);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 190, 726);
  ctx.lineTo(cx + 190, 726);
  ctx.stroke();
  ctx.globalAlpha = 1;

  tracked(ctx, '45.2% ABV', cx - 150, 790, '500 27px "IBM Plex Mono", monospace', 5, GOLD_SOFT, 0.9);
  tracked(ctx, '50 CL', cx + 160, 790, '500 27px "IBM Plex Mono", monospace', 5, GOLD_SOFT, 0.9);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** The neck band: navy with claret pinstripes and the name set vertically. */
function neckTexture() {
  const w = 1024;
  const h = 360;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = CLARET;
  ctx.fillRect(0, 0, w, 16);
  ctx.fillRect(0, h - 16, w, 16);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 16, w, 3);
  ctx.fillRect(0, h - 19, w, 3);

  // Two claret side panels, as on the real neck wrap
  ctx.fillStyle = CLARET;
  ctx.fillRect(w * 0.24, 22, w * 0.06, h - 44);
  ctx.fillRect(w * 0.7, 22, w * 0.06, h - 44);

  ctx.save();
  ctx.translate(w * 0.5, h * 0.5);
  tracked(ctx, 'ASHMONT GIN', 0, 8, '500 42px "IBM Plex Mono", monospace', 11, GOLD_SOFT);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * @param {object} opts
 * @param {'high'|'medium'|'low'} opts.tier
 */
export function createBottle({ tier = 'high' } = {}) {
  const group = new THREE.Group();

  const radial = tier === 'high' ? 288 : tier === 'medium' ? 144 : 72;
  const subdiv = tier === 'high' ? 5 : 3;
  const canFlute = tier !== 'low';

  const profile = smoothProfile(PROFILE, subdiv);
  const glassGeo = new THREE.LatheGeometry(profile, radial);
  if (canFlute) fluteGeometry(glassGeo);
  else glassGeo.computeVertexNormals();

  /* Pale ice-blue glass. The real bottle is close to clear with a cool
     cast, so attenuation is long and light rather than deep sapphire. */
  const glassTint = new THREE.Color(0x7fb2dc);

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
      attenuationDistance: 1.55,
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

  /* Navy neck band with claret pinstripes. */
  const neckMat = new THREE.MeshStandardMaterial({
    map: neckTexture(),
    roughness: 0.72,
    metalness: 0.08,
    envMapIntensity: 0.6,
  });
  const neckBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.288, 0.288, 0.4, 128, 1, true),
    neckMat
  );
  neckBand.position.y = 2.36;
  group.add(neckBand);

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
      [glassGeo, liquid.geometry, cap.geometry, capTop.geometry, neckBand.geometry, label.geometry].forEach(
        (g) => g.dispose()
      );
      rimMat.dispose();
      [glassMat, liquidMat, woodMat, neckMat, labelMat].forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    },
  };
}
