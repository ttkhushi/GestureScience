import * as THREE from "three";

// Very rough equirectangular continent silhouettes (normalized 0-1 blobs),
// good enough at globe scale to read as "Earth" without needing a real asset.
const CONTINENT_BLOBS = [
  { cx: 0.20, cy: 0.32, rx: 0.09, ry: 0.16 }, // N. America
  { cx: 0.27, cy: 0.62, rx: 0.05, ry: 0.14 }, // S. America
  { cx: 0.48, cy: 0.28, rx: 0.07, ry: 0.10 }, // Europe
  { cx: 0.50, cy: 0.55, rx: 0.09, ry: 0.18 }, // Africa
  { cx: 0.68, cy: 0.30, rx: 0.16, ry: 0.14 }, // Asia
  { cx: 0.78, cy: 0.68, rx: 0.07, ry: 0.06 }, // Australia
];

function drawBlobCluster(ctx, w, h, blob, seed) {
  ctx.save();
  ctx.translate(blob.cx * w, blob.cy * h);
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const n = 0.75 + 0.25 * Math.sin(a * 3 + seed) * Math.cos(a * 2 + seed * 1.7);
    const x = Math.cos(a) * blob.rx * w * n;
    const y = Math.sin(a) * blob.ry * h * n;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Returns { colorMap, emissiveMap } canvas textures approximating the
 * "Earth at night" reference: dark navy oceans, faint landmass tone,
 * and scattered glowing city-light clusters on the continents.
 */
export function buildEarthTextures(width = 1024, height = 512) {
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cctx = colorCanvas.getContext("2d");

  // Ocean base
  const oceanGrad = cctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, "#050a18");
  oceanGrad.addColorStop(0.5, "#071022");
  oceanGrad.addColorStop(1, "#050a18");
  cctx.fillStyle = oceanGrad;
  cctx.fillRect(0, 0, width, height);

  // Landmasses (subtle warm-dark tone, visible day-side texture)
  cctx.fillStyle = "#1c2436";
  CONTINENT_BLOBS.forEach((b, i) => drawBlobCluster(cctx, width, height, b, i * 1.3));

  const emissiveCanvas = document.createElement("canvas");
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const ectx = emissiveCanvas.getContext("2d");
  ectx.fillStyle = "#000000";
  ectx.fillRect(0, 0, width, height);

  // City-light clusters: dense warm dots scattered inside each continent blob
  CONTINENT_BLOBS.forEach((b, ci) => {
    const cx = b.cx * width;
    const cy = b.cy * height;
    const count = 90;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random();
      const x = cx + Math.cos(ang) * b.rx * width * rad * 0.9;
      const y = cy + Math.sin(ang) * b.ry * height * rad * 0.9;
      const bright = Math.random();
      const r = bright > 0.85 ? 1.6 : 0.8;
      ectx.beginPath();
      ectx.fillStyle = bright > 0.7 ? "#fff3c9" : "#ffcf7a";
      ectx.globalAlpha = 0.35 + bright * 0.5;
      ectx.arc(x, y, r, 0, Math.PI * 2);
      ectx.fill();
    }
  });
  ectx.globalAlpha = 1;

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  return { colorMap, emissiveMap };
}

/** Small tileable-ish canvas texture for a mountainous terrain close-up (deepest zoom). */
export function buildTerrainTexture(width = 512, height = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#8fa4b0");
  grad.addColorStop(0.4, "#5b6f5a");
  grad.addColorStop(0.75, "#3c4a3a");
  grad.addColorStop(1, "#20261f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const s = Math.random() * 2.2;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#0a0a0a";
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
