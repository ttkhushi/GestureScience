import * as THREE from "three";

/**
 * Builds a billboard sprite that renders `text` on a transparent canvas.
 * Used for planet name labels, base-pair letters, and chemical formula tags.
 */
export function createTextSprite(text, {
  color = "#cfe3ff",
  fontSize = 42,
  fontWeight = 600,
  scale = 0.6,
  padding = 14,
  glow = null,
} = {}) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = `${fontWeight} ${fontSize}px 'Segoe UI', Arial, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width) + padding * 2;
  canvas.height = fontSize + padding * 2;

  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = fontSize * 0.5;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(scale * aspect, scale, 1);
  return sprite;
}
