import * as THREE from "three";

// Cheap deterministic pseudo-noise so we don't need an extra noise dependency.
function hashNoise(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

export default class BrainScene {
  constructor() {
    this.name = "BRAIN";
    this.levelNames = [
      "COMPLETE BRAIN",
      "LOBES",
      "NEURONS",
      "SYNAPSES",
      "NEURAL NETWORK",
    ];
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    // Anatomical-ish displaced sphere with sulci/gyri style ridges.
    const geometry = new THREE.IcosahedronGeometry(1.6, 6);
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ridge = Math.sin(v.x * 6 + v.y * 3) * 0.05 + Math.sin(v.y * 8 - v.z * 4) * 0.04;
      const n = hashNoise(v.x * 2.2, v.y * 2.2, v.z * 2.2);
      const displacement = 1 + (n - 0.5) * 0.16 + ridge;
      v.multiplyScalar(displacement);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geometry.computeVertexNormals();

    // Dark translucent base so the glowing edge/network reads clearly, like
    // an MRI-style bioluminescent scan.
    const material = new THREE.MeshStandardMaterial({
      color: 0x0a0f1c,
      emissive: 0x0e3a52,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.3,
      transparent: true,
      opacity: 0.55,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.group.add(this.mesh);

    // Glowing electric-blue edge lines tracing the folds (sulci/gyri look).
    const edgeGeo = new THREE.EdgesGeometry(geometry, 12);
    this.edges = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.65 })
    );
    this.group.add(this.edges);

    // Halo network: scattered nodes connected to nearby neighbors, forming
    // the constellation-like web seen wrapped around the reference brain.
    const haloCount = 70;
    const haloPositions = [];
    for (let i = 0; i < haloCount; i++) {
      const r = 2.05 + Math.random() * 0.55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      haloPositions.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ));
    }
    const haloLineVerts = [];
    for (let i = 0; i < haloPositions.length; i++) {
      for (let j = i + 1; j < haloPositions.length; j++) {
        if (haloPositions[i].distanceTo(haloPositions[j]) < 1.1) {
          haloLineVerts.push(haloPositions[i].x, haloPositions[i].y, haloPositions[i].z);
          haloLineVerts.push(haloPositions[j].x, haloPositions[j].y, haloPositions[j].z);
        }
      }
    }
    const haloLineGeo = new THREE.BufferGeometry();
    haloLineGeo.setAttribute("position", new THREE.Float32BufferAttribute(haloLineVerts, 3));
    this.haloLines = new THREE.LineSegments(
      haloLineGeo,
      new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.35 })
    );
    this.group.add(this.haloLines);

    const haloDotGeo = new THREE.BufferGeometry();
    const haloDotArr = new Float32Array(haloPositions.length * 3);
    haloPositions.forEach((p, i) => { haloDotArr[i * 3] = p.x; haloDotArr[i * 3 + 1] = p.y; haloDotArr[i * 3 + 2] = p.z; });
    haloDotGeo.setAttribute("position", new THREE.BufferAttribute(haloDotArr, 3));
    this.haloDots = new THREE.Points(
      haloDotGeo,
      new THREE.PointsMaterial({ color: 0xbfe0ff, size: 0.045, transparent: true, opacity: 0.8 })
    );
    this.group.add(this.haloDots);

    // Neurons: bright points seeded ON the cortical surface, revealed at
    // deeper zoom (level >= 2).
    const N = 900;
    const neuronPositions = new Float32Array(N * 3);
    const surfacePos = geometry.attributes.position;
    for (let i = 0; i < N; i++) {
      const idx = Math.floor(Math.random() * (surfacePos.count));
      const nx = surfacePos.getX(idx) * 1.01;
      const ny = surfacePos.getY(idx) * 1.01;
      const nz = surfacePos.getZ(idx) * 1.01;
      neuronPositions[i * 3] = nx;
      neuronPositions[i * 3 + 1] = ny;
      neuronPositions[i * 3 + 2] = nz;
    }
    const neuronGeo = new THREE.BufferGeometry();
    neuronGeo.setAttribute("position", new THREE.BufferAttribute(neuronPositions, 3));
    this.neurons = new THREE.Points(
      neuronGeo,
      new THREE.PointsMaterial({ color: 0x9fe8ff, size: 0.028, transparent: true, opacity: 0 })
    );
    this.group.add(this.neurons);

    // Synapses: fine connective lines between nearby neurons, revealed at
    // level >= 3, pulse-animated via opacity in update().
    const synVerts = [];
    const sample = 220; // keep line count sane
    for (let i = 0; i < sample; i++) {
      const a = Math.floor(Math.random() * N);
      const b = Math.floor(Math.random() * N);
      synVerts.push(
        neuronPositions[a * 3], neuronPositions[a * 3 + 1], neuronPositions[a * 3 + 2],
        neuronPositions[b * 3], neuronPositions[b * 3 + 1], neuronPositions[b * 3 + 2]
      );
    }
    const synGeo = new THREE.BufferGeometry();
    synGeo.setAttribute("position", new THREE.Float32BufferAttribute(synVerts, 3));
    this.synapses = new THREE.LineSegments(
      synGeo,
      new THREE.LineBasicMaterial({ color: 0xc98fff, transparent: true, opacity: 0 })
    );
    this.group.add(this.synapses);

    this._clock = 0;
  }

  setZoomLevel(level) {
    // 0 complete brain -> 1 lobes -> 2 neurons -> 3 synapses -> 4 dense network
    const meshFade = level >= 2 ? Math.max(0.08, 0.55 - (level - 2) * 0.22) : 0.55;
    this.mesh.material.opacity = meshFade;
    this.edges.material.opacity = level >= 1 ? 0.75 : 0.5;

    this.neurons.material.opacity = level >= 2 ? Math.min(1, (level - 1.4)) : 0;
    this.synapses.material.opacity = level >= 3 ? Math.min(0.9, (level - 2.4)) : 0;

    const haloFade = level >= 4 ? 1.4 : 0.8;
    this.haloLines.material.opacity = 0.35 * haloFade / 1.4;
    this.haloDots.material.opacity = 0.8;

    const scale = 1 + Math.max(0, level - 1) * 0.35;
    this.group.scale.setScalar(scale);
  }

  rotateBy(deltaDeg) {
    this.group.rotation.y += THREE.MathUtils.degToRad(deltaDeg);
  }

  update(dt) {
    this._clock += dt;
    this.group.rotation.y += dt * 0.05; // slow idle rotation
    this.haloDots.rotation.y -= dt * 0.02;
    this.haloLines.rotation.y -= dt * 0.02;
    if (this.synapses.material.opacity > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this._clock * 2.4);
      this.synapses.material.opacity = Math.max(0.15, this.synapses.material.opacity) * (0.6 + 0.4 * pulse);
    }
  }
}
