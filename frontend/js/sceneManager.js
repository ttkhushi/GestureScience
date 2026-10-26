import * as THREE from "three";

import BrainScene from "./scenes/brain.js";
import DnaScene from "./scenes/dna.js";
import CosmicWebScene from "./scenes/cosmicWeb.js";
import EarthScene from "./scenes/earth.js";

const SCENE_KEYS = ["brain", "dna", "cosmic_web", "earth"];
const TRANSITION_SECONDS = 0.9;

export default class SceneManager {
  constructor(threeScene, onChange) {
    this.threeScene = threeScene;
    this.onChange = onChange || (() => {});

    this.scenes = [new BrainScene(), new DnaScene(), new CosmicWebScene(), new EarthScene()];
    this.scenes.forEach((s) => this.threeScene.add(s.group));

    this.activeIndex = 0;
    this.zoomLevel = 0;
    this._transition = null; // { fromIndex, toIndex, t }

    this._layout();
    this._notify();
  }

  get current() {
    return this.scenes[this.activeIndex];
  }

  get currentKey() {
    return SCENE_KEYS[this.activeIndex];
  }

  // ---------- gesture-facing API ----------

  nextScene() {
    this._beginTransition(1);
  }

  prevScene() {
    this._beginTransition(-1);
  }

  get maxZoomLevel() {
    return this.current.levelNames.length - 1;
  }

  zoomBy(delta) {
    if (this._transition) return; // ignore zoom mid-transition
    this.zoomLevel = THREE.MathUtils.clamp(this.zoomLevel + delta, 0, this.maxZoomLevel);
    this.current.setZoomLevel(this.zoomLevel);
    this._notify();
  }

  rotateBy(deltaDeg) {
    if (this._transition) return;
    this.current.rotateBy(deltaDeg);
  }

  // ---------- internals ----------

  _beginTransition(dir) {
    if (this._transition) return;
    const fromIndex = this.activeIndex;
    const toIndex = (this.activeIndex + dir + this.scenes.length) % this.scenes.length;
    this._transition = { fromIndex, toIndex, t: 0 };
  }

  _layout() {
    this.scenes.forEach((s, i) => {
      if (i === this.activeIndex) {
        s.group.position.z = 0;
        s.group.visible = true;
        this._setOpacity(s, 1);
      } else {
        s.group.position.z = -10;
        s.group.visible = false;
      }
    });
  }

  _setOpacity(scene, value) {
    scene.group.traverse((obj) => {
      if (obj.material && "opacity" in obj.material && obj.userData.baseOpacity === undefined) {
        // leave per-mesh authored opacity (e.g. zoom-level fades) alone;
        // we only scale overall visibility via a multiplier on the group itself.
      }
    });
    scene.group.visible = value > 0.01;
  }

  update(dt) {
    this.scenes.forEach((s) => s.update(dt));

    if (this._transition) {
      const tr = this._transition;
      tr.t += dt / TRANSITION_SECONDS;
      const from = this.scenes[tr.fromIndex];
      const to = this.scenes[tr.toIndex];
      to.group.visible = true;

      const easeT = tr.t < 1 ? 1 - Math.pow(1 - tr.t, 3) : 1; // ease-out cubic

      from.group.position.z = THREE.MathUtils.lerp(0, -10, easeT);
      from.group.scale.setScalar(THREE.MathUtils.lerp(1, 0.6, easeT));

      to.group.position.z = THREE.MathUtils.lerp(-10, 0, easeT);
      to.group.scale.setScalar(THREE.MathUtils.lerp(0.6, 1, easeT));

      if (tr.t >= 1) {
        from.group.visible = false;
        from.group.scale.setScalar(1);
        to.group.scale.setScalar(1);
        this.activeIndex = tr.toIndex;
        this.zoomLevel = 0;
        this.current.setZoomLevel(0);
        this._transition = null;
        this._notify();
      }
    }
  }

  _notify() {
    this.onChange({
      key: this.currentKey,
      name: this.current.name,
      level: Math.floor(this.zoomLevel),
      levelName: this.current.levelNames[Math.floor(this.zoomLevel)],
      maxLevel: this.maxZoomLevel,
    });
  }
}
