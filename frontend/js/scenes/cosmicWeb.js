import * as THREE from "three";
import { createTextSprite } from "../utils/textSprite.js";

const PLANETS = [
  { name: "Mercury", color: 0x9c9c9c, dist: 0.6, size: 0.045 },
  { name: "Venus", color: 0xe0c07a, dist: 0.85, size: 0.07 },
  { name: "Earth", color: 0x4f8ee6, dist: 1.15, size: 0.075 },
  { name: "Mars", color: 0xc1512f, dist: 1.45, size: 0.06 },
  { name: "Jupiter", color: 0xd9a066, dist: 1.95, size: 0.18, bands: true },
  { name: "Saturn", color: 0xe0cc94, dist: 2.5, size: 0.16, rings: true },
  { name: "Uranus", color: 0x9fe0e0, dist: 2.95, size: 0.11 },
  { name: "Neptune", color: 0x4f6fe6, dist: 3.35, size: 0.11 },
];

function makeGlowSprite(color, size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(0.4, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function buildSpiralGalaxy({ count, radius, arms, spin, thickness, coreColor, armColor }) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cCore = new THREE.Color(coreColor);
  const cArm = new THREE.Color(armColor);
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 1.5) * radius;
    const armAngle = ((i % arms) / arms) * Math.PI * 2;
    const angle = armAngle + r * spin + (Math.random() - 0.5) * 0.4;
    const x = Math.cos(angle) * r + (Math.random() - 0.5) * 0.05 * r;
    const z = Math.sin(angle) * r + (Math.random() - 0.5) * 0.05 * r;
    const y = (Math.random() - 0.5) * thickness * (1 - r / radius);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    const mix = cCore.clone().lerp(cArm, Math.min(1, r / radius));
    colors[i * 3] = mix.r;
    colors[i * 3 + 1] = mix.g;
    colors[i * 3 + 2] = mix.b;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size: 0.02, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
}

export default class CosmicWebScene {
  constructor() {
    this.name = "COSMIC WEB";
    this.levelNames = [
      "COSMIC WEB",
      "GALAXY CLUSTERS",
      "GALAXY (SPIRAL)",
      "MILKY WAY",
      "SOLAR SYSTEM",
    ];
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    // --- Level 0: large-scale filament web -------------------------------
    const N = 900;
    const nodePositions = [];
    for (let i = 0; i < N; i++) {
      nodePositions.push(new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ));
    }
    const dotGeo = new THREE.BufferGeometry();
    const dotArr = new Float32Array(N * 3);
    nodePositions.forEach((p, i) => { dotArr[i * 3] = p.x; dotArr[i * 3 + 1] = p.y; dotArr[i * 3 + 2] = p.z; });
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotArr, 3));
    this.filamentDots = new THREE.Points(
      dotGeo,
      new THREE.PointsMaterial({ color: 0x9fc2ff, size: 0.035, transparent: true, opacity: 0.85 })
    );

    // Sparse nearest-neighbor connective lines so it reads as a "web" rather
    // than a random point cloud (matching filament-structure cosmology renders).
    const webVerts = [];
    const sampleCount = 260;
    for (let s = 0; s < sampleCount; s++) {
      const i = Math.floor(Math.random() * N);
      let best = -1, bestDist = Infinity;
      for (let t = 0; t < 40; t++) {
        const j = Math.floor(Math.random() * N);
        if (j === i) continue;
        const d = nodePositions[i].distanceTo(nodePositions[j]);
        if (d < bestDist) { bestDist = d; best = j; }
      }
      if (best >= 0 && bestDist < 2.2) {
        webVerts.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z);
        webVerts.push(nodePositions[best].x, nodePositions[best].y, nodePositions[best].z);
      }
    }
    const webGeo = new THREE.BufferGeometry();
    webGeo.setAttribute("position", new THREE.Float32BufferAttribute(webVerts, 3));
    this.filamentLines = new THREE.LineSegments(
      webGeo,
      new THREE.LineBasicMaterial({ color: 0x5f7fbf, transparent: true, opacity: 0.4 })
    );

    this.filamentGroup = new THREE.Group();
    this.filamentGroup.add(this.filamentDots, this.filamentLines);
    this.group.add(this.filamentGroup);

    // --- Level 1: galaxy clusters (clumped point groups) -------------------
    this.clusterGroup = new THREE.Group();
    for (let c = 0; c < 12; c++) {
      const center = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      const clusterGeo = new THREE.BufferGeometry();
      const cN = 60;
      const arr = new Float32Array(cN * 3);
      for (let i = 0; i < cN; i++) {
        arr[i * 3] = center.x + (Math.random() - 0.5) * 0.6;
        arr[i * 3 + 1] = center.y + (Math.random() - 0.5) * 0.6;
        arr[i * 3 + 2] = center.z + (Math.random() - 0.5) * 0.6;
      }
      clusterGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const cluster = new THREE.Points(clusterGeo, new THREE.PointsMaterial({ color: 0xd8e6ff, size: 0.045, transparent: true, opacity: 0 }));
      this.clusterGroup.add(cluster);
    }
    this.group.add(this.clusterGroup);

    // --- Level 2: single spiral galaxy (Hubble-style) -----------------------
    this.galaxy = buildSpiralGalaxy({ count: 4500, radius: 2.2, arms: 4, spin: 1.6, thickness: 0.18, coreColor: "#fff3d6", armColor: "#7fb3ff" });
    this.galaxyCore = makeGlowSprite("rgba(255,244,214,0.95)", 0.9);
    this.galaxyCore.material.opacity = 0;
    this.group.add(this.galaxy, this.galaxyCore);

    // --- Level 3: milky way (denser band, viewed more edge-on) --------------
    this.milkyWay = buildSpiralGalaxy({ count: 6000, radius: 3.4, arms: 5, spin: 2.4, thickness: 0.5, coreColor: "#ffe9c2", armColor: "#bcd4ff" });
    this.milkyWay.rotation.x = Math.PI / 2.6;
    this.milkyWayLabel = createTextSprite("MILKY WAY", { color: "#dfe9ff", scale: 0.45, glow: "#7fb3ff" });
    this.milkyWayLabel.position.set(0, 2.4, 0);
    this.milkyWayLabel.visible = false;
    this.group.add(this.milkyWay, this.milkyWayLabel);

    // --- Level 4: solar system with labeled planets -------------------------
    this.solarSystem = new THREE.Group();
    this.solarSystem.visible = false;

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdd88 })
    );
    const sunGlow = makeGlowSprite("rgba(255,221,136,0.9)", 1.1);
    this.solarSystem.add(sun, sunGlow);

    this.planetMeshes = PLANETS.map((p) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.size, 20, 20),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.6, emissive: p.color, emissiveIntensity: 0.15 })
      );
      mesh.position.set(p.dist, 0, 0);

      if (p.rings) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(p.size * 1.4, p.size * 2.2, 48),
          new THREE.MeshBasicMaterial({ color: 0xd8c69a, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
        );
        ring.rotation.x = Math.PI / 2.3;
        mesh.add(ring);
      }

      const label = createTextSprite(p.name, { color: "#dfe9ff", scale: 0.16, fontSize: 30 });
      label.position.set(0, p.size + 0.12, 0);
      mesh.add(label);

      // faint orbit path ring
      const orbitPath = new THREE.Mesh(
        new THREE.RingGeometry(p.dist - 0.004, p.dist + 0.004, 96),
        new THREE.MeshBasicMaterial({ color: 0x3a5075, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
      );
      orbitPath.rotation.x = Math.PI / 2;
      this.solarSystem.add(orbitPath);

      const orbit = new THREE.Group();
      orbit.add(mesh);
      orbit.rotation.y = Math.random() * Math.PI * 2;
      this.solarSystem.add(orbit);
      return { orbit, mesh, dist: p.dist };
    });

    this.group.add(this.solarSystem);
  }

  setZoomLevel(level) {
    this.filamentDots.material.opacity = level <= 1 ? 0.85 : Math.max(0, 0.85 - (level - 1) * 0.4);
    this.filamentLines.material.opacity = level <= 1 ? 0.4 : Math.max(0, 0.4 - (level - 1) * 0.2);

    const clusterOpacity = level >= 1 ? Math.min(0.9, (level - 0.6)) : 0;
    this.clusterGroup.children.forEach((c) => { c.material.opacity = level < 2 ? clusterOpacity : Math.max(0, clusterOpacity - (level - 2)); });

    const galaxyT = THREE.MathUtils.clamp(level - 1.4, 0, 1);
    this.galaxy.material.opacity = level < 3 ? galaxyT : Math.max(0, 1 - (level - 3));
    this.galaxyCore.material.opacity = this.galaxy.material.opacity;

    const milkyT = THREE.MathUtils.clamp(level - 2.6, 0, 1);
    this.milkyWay.material.opacity = level < 4 ? milkyT : Math.max(0, 1 - (level - 4) * 2);
    this.milkyWayLabel.visible = milkyT > 0.3 && level < 4;

    this.solarSystem.visible = level >= 4;

    const scale = 1 + Math.max(0, level - 2) * 0.5;
    this.group.scale.setScalar(scale);
  }

  rotateBy(deltaDeg) {
    this.group.rotation.y += THREE.MathUtils.degToRad(deltaDeg);
  }

  update(dt) {
    this.filamentGroup.rotation.y += dt * 0.015;
    this.clusterGroup.rotation.y += dt * 0.01;
    this.galaxy.rotation.y += dt * 0.04;
    this.milkyWay.rotation.z += dt * 0.02;
    this.planetMeshes.forEach((p, i) => {
      p.orbit.rotation.y += dt * (0.25 / (i + 1));
      p.mesh.rotation.y += dt * 0.6;
    });
  }
}
