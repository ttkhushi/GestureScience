import * as THREE from "three";
import { buildEarthTextures, buildTerrainTexture } from "../utils/earthTexture.js";
import { createTextSprite } from "../utils/textSprite.js";

export default class EarthScene {
  constructor() {
    this.name = "EARTH";
    this.levelNames = [
      "WHOLE EARTH — NIGHT LIGHTS",
      "CONTINENTS",
      "GEOGRAPHICAL REGION",
      "MOUNTAIN TERRAIN",
    ];
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    const { colorMap, emissiveMap } = buildEarthTextures();

    const geo = new THREE.SphereGeometry(1.5, 96, 96);
    const material = new THREE.MeshStandardMaterial({
      map: colorMap,
      emissiveMap: emissiveMap,
      emissive: new THREE.Color(0xffdca0),
      emissiveIntensity: 1.4,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.earth = new THREE.Mesh(geo, material);
    this.group.add(this.earth);

    // Thin cloud shell for extra realism / parallax on rotation
    const cloudGeo = new THREE.SphereGeometry(1.515, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
      roughness: 1,
      depthWrite: false,
    });
    this.clouds = new THREE.Mesh(cloudGeo, cloudMat);
    this.group.add(this.clouds);

    // Atmosphere glow (fresnel-style, view-dependent rim light)
    const atmoGeo = new THREE.SphereGeometry(1.58, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.35, 0.65, 1.0, 1.0) * intensity;
        }
      `,
    });
    this.atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    this.group.add(this.atmosphere);

    // Lat/long grid, revealed at "geographical region" level
    const gridGeo = new THREE.SphereGeometry(1.52, 32, 20);
    this.grid = new THREE.Mesh(
      gridGeo,
      new THREE.MeshBasicMaterial({ color: 0x8fb4ff, wireframe: true, transparent: true, opacity: 0 })
    );
    this.group.add(this.grid);

    // Region label, shown at level 2+
    this.regionLabel = createTextSprite("SCANNING REGION", { color: "#9fd1ff", scale: 0.32, glow: "#4f8ee6" });
    this.regionLabel.position.set(0, 2.1, 0);
    this.regionLabel.visible = false;
    this.group.add(this.regionLabel);

    // Deepest level: a mountainous terrain patch that crossfades in and
    // occupies the view like we've descended to ground level.
    const terrainTexture = buildTerrainTexture();
    const terrainGeo = new THREE.PlaneGeometry(3.4, 2.2, 120, 80);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const ridge = Math.sin(x * 1.6) * 0.25 + Math.sin(y * 2.3 + x) * 0.18;
      const jagged = (Math.sin(x * 9 + y * 7) * 0.5 + Math.sin(x * 17 - y * 5) * 0.5) * 0.06;
      posAttr.setZ(i, ridge + jagged);
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0,
    });
    this.terrain = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrain.rotation.x = -0.35;
    this.terrain.position.z = 1.2;
    this.terrain.visible = false;
    this.group.add(this.terrain);
  }

  setZoomLevel(level) {
    this.grid.material.opacity = level >= 1 ? Math.min(0.35, level * 0.14) : 0;
    this.regionLabel.visible = level >= 1.5;

    const terrainT = THREE.MathUtils.clamp(level - 2, 0, 1);
    this.terrain.visible = terrainT > 0.02;
    this.terrain.material.opacity = terrainT;
    [this.earth, this.clouds, this.atmosphere].forEach((m) => {
      m.material.opacity = m === this.earth ? 1 : m.material.opacity;
    });
    const fade = 1 - terrainT;
    this.earth.material.transparent = terrainT > 0;
    this.earth.material.opacity = fade;
    this.clouds.material.opacity = 0.06 * fade;
    this.atmosphere.material.opacity = fade;

    const scale = 1 + Math.min(level, 2) * 0.6;
    this.group.scale.setScalar(scale);
  }

  rotateBy(deltaDeg) {
    this.group.rotation.y += THREE.MathUtils.degToRad(deltaDeg);
  }

  update(dt) {
    this.group.rotation.y += dt * 0.08; // realistic slow spin
    this.clouds.rotation.y += dt * 0.015;
  }
}
