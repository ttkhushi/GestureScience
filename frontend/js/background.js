import * as THREE from "three";

// Per-scene subtle tint + density, per spec section 9 (dynamic background).
const SCENE_STYLE = {
  brain: { color: 0x8f6fa0, density: 900, fog: 0x0a0812 },
  dna: { color: 0x4f6fa0, density: 700, fog: 0x060a14 },
  cosmic_web: { color: 0xbfd4ff, density: 1600, fog: 0x02030a },
  earth: { color: 0x6f9fdf, density: 1200, fog: 0x03060f },
};

export default class Background {
  constructor(scene) {
    this.scene = scene;
    this._current = "brain";

    const geo = new THREE.BufferGeometry();
    const N = 2000;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    this.material = new THREE.PointsMaterial({
      color: SCENE_STYLE.brain.color,
      size: 0.03,
      transparent: true,
      opacity: 0.6,
    });
    this.points = new THREE.Points(geo, this.material);
    this.scene.add(this.points);
    this.scene.fog = new THREE.FogExp2(SCENE_STYLE.brain.fog, 0.035);

    this._targetColor = new THREE.Color(SCENE_STYLE.brain.color);
    this._targetFog = new THREE.Color(SCENE_STYLE.brain.fog);
  }

  setScene(sceneKey) {
    const style = SCENE_STYLE[sceneKey] || SCENE_STYLE.brain;
    this._targetColor.set(style.color);
    this._targetFog.set(style.fog);
  }

  update(dt) {
    this.points.rotation.y += dt * 0.01;
    this.material.color.lerp(this._targetColor, dt * 1.2);
    this.scene.fog.color.lerp(this._targetFog, dt * 1.2);
  }
}
