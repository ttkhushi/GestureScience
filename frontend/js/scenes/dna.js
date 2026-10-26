import * as THREE from "three";
import { createTextSprite } from "../utils/textSprite.js";

const BASE_COLORS = {
  A: 0x4fd17d, // green
  T: 0xe6584f, // red
  G: 0x4f8ee6, // blue
  C: 0xe6c94f, // yellow
};

const CHEM_LABELS = [
  "C5H10O4 — Deoxyribose sugar",
  "PO4³⁻ — Phosphate group",
  "Histone protein core",
  "Hydrogen bonds (A=T, G≡C)",
];

export default class DnaScene {
  constructor() {
    this.name = "DNA";
    this.levelNames = [
      "DOUBLE HELIX",
      "CLOSER HELIX",
      "BASE PAIRS (A-T / G-C)",
      "NUCLEOTIDE BACKBONE",
      "PROTEIN & CHEMICAL LABELS",
    ];
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    const turns = 6;
    const pointsPerTurn = 28;
    const totalPoints = turns * pointsPerTurn;
    const radius = 0.9;
    const height = 4.4;

    const curvePtsA = [];
    const curvePtsB = [];
    this.rungGroup = new THREE.Group();
    this.backboneGroup = new THREE.Group();
    const sequence = "ATGCATGCATGCATGCATGCATGC".split("");

    for (let i = 0; i <= totalPoints; i++) {
      const angle = (i / pointsPerTurn) * Math.PI * 2;
      const y = (i / totalPoints) * height - height / 2;
      const ax = Math.cos(angle) * radius;
      const az = Math.sin(angle) * radius;
      const bx = Math.cos(angle + Math.PI) * radius;
      const bz = Math.sin(angle + Math.PI) * radius;
      curvePtsA.push(new THREE.Vector3(ax, y, az));
      curvePtsB.push(new THREE.Vector3(bx, y, bz));

      if (i % 2 === 0 && i < totalPoints) {
        const base = sequence[(i / 2) % sequence.length];
        const pair = base === "A" ? "T" : base === "T" ? "A" : base === "G" ? "C" : "G";
        this._addRung(ax, y, az, bx, y, bz, base, pair);
        this._addBackboneMarkers(ax, y, az, bx, y, bz);
      }
    }

    // Thick glowing tube strands instead of thin lines — reads as an actual
    // molecular ribbon rather than a wireframe schematic.
    const curveA = new THREE.CatmullRomCurve3(curvePtsA);
    const curveB = new THREE.CatmullRomCurve3(curvePtsB);
    const strandMat = new THREE.MeshStandardMaterial({
      color: 0x1c3a66,
      emissive: 0x3f7fdb,
      emissiveIntensity: 0.9,
      roughness: 0.35,
      metalness: 0.4,
    });
    this.strandA = new THREE.Mesh(new THREE.TubeGeometry(curveA, 220, 0.045, 10, false), strandMat);
    this.strandB = new THREE.Mesh(new THREE.TubeGeometry(curveB, 220, 0.045, 10, false), strandMat.clone());
    this.group.add(this.strandA, this.strandB, this.rungGroup, this.backboneGroup);

    // Floating chemical/protein labels, shown only at the deepest level.
    this.labelGroup = new THREE.Group();
    CHEM_LABELS.forEach((text, i) => {
      const sprite = createTextSprite(text, { color: "#eaf3ff", scale: 0.26, glow: "#4f8ee6" });
      sprite.position.set(1.4, height / 2 - i * 0.9, 0);
      this.labelGroup.add(sprite);
    });
    this.labelGroup.visible = false;
    this.group.add(this.labelGroup);
  }

  _addRung(ax, ay, az, bx, by, bz, base, pair) {
    const mid = new THREE.Vector3((ax + bx) / 2, ay, (az + bz) / 2);
    const dir = new THREE.Vector3(bx - ax, 0, bz - az);
    const len = dir.length();
    const rungGeo = new THREE.CylinderGeometry(0.02, 0.02, len, 6);
    const rungMat = new THREE.MeshStandardMaterial({ color: 0x3a5075, transparent: true, opacity: 0.6 });
    const rung = new THREE.Mesh(rungGeo, rungMat);
    rung.position.copy(mid);
    rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.rungGroup.add(rung);

    const sphereGeo = new THREE.SphereGeometry(0.07, 14, 14);
    const baseA = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: BASE_COLORS[base], emissive: BASE_COLORS[base], emissiveIntensity: 0.3 }));
    baseA.position.set(ax, ay, az);
    const baseB = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: BASE_COLORS[pair], emissive: BASE_COLORS[pair], emissiveIntensity: 0.3 }));
    baseB.position.set(bx, by, bz);

    // hidden until zoom level >= 2 (base-pair level)
    baseA.visible = false;
    baseB.visible = false;
    this.rungGroup.add(baseA, baseB);
    rung.userData.baseA = baseA;
    rung.userData.baseB = baseB;

    // occasional letter label so the base sequence is legible without clutter
    if (Math.random() < 0.35) {
      const label = createTextSprite(base, { color: "#ffffff", scale: 0.18, fontSize: 34 });
      label.position.set(ax * 1.25, ay, az * 1.25);
      label.visible = false;
      this.rungGroup.add(label);
      rung.userData.label = label;
    }
  }

  _addBackboneMarkers(ax, ay, az, bx, by, bz) {
    // Small phosphate-group marker spheres along each backbone, revealed at
    // the "nucleotide backbone" level.
    const geo = new THREE.SphereGeometry(0.045, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffb15c, emissive: 0xffb15c, emissiveIntensity: 0.4 });
    const markerA = new THREE.Mesh(geo, mat);
    markerA.position.set(ax * 1.08, ay, az * 1.08);
    const markerB = new THREE.Mesh(geo, mat.clone());
    markerB.position.set(bx * 1.08, by, bz * 1.08);
    markerA.visible = false;
    markerB.visible = false;
    this.backboneGroup.add(markerA, markerB);
  }

  setZoomLevel(level) {
    const showBases = level >= 2;
    const showBackbone = level >= 3;
    this.rungGroup.children.forEach((child) => {
      if (child.userData.baseA) {
        child.userData.baseA.visible = showBases;
        child.userData.baseB.visible = showBases;
      }
      if (child.userData.label) {
        child.userData.label.visible = showBases;
      }
    });
    this.backboneGroup.children.forEach((m) => { m.visible = showBackbone; });
    this.labelGroup.visible = level >= 4;

    // deeper levels: push camera-relative scale up so the structure reads as "zoomed in"
    const scale = 1 + Math.max(0, level - 1) * 0.4;
    this.group.scale.setScalar(scale);
  }

  rotateBy(deltaDeg) {
    this.group.rotation.y += THREE.MathUtils.degToRad(deltaDeg);
  }

  update(dt) {
    this.group.rotation.y += dt * 0.15;
  }
}
