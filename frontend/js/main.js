import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import SceneManager from "./sceneManager.js";
import Background from "./background.js";
import { connectGestureSocket } from "./websocket.js";
import { updateSceneInfo, setConnectionStatus, flashGestureCursor } from "./ui.js";

const canvas = document.getElementById("scene-canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

scene.add(new THREE.AmbientLight(0x445577, 0.6));
const keyLight = new THREE.DirectionalLight(0xbfd4ff, 1.1);
keyLight.position.set(4, 3, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x8f6fff, 0.4);
rimLight.position.set(-4, -2, -3);
scene.add(rimLight);

const background = new Background(scene);

// Bloom gives the electric-glow look seen in the brain / DNA / galaxy
// reference art (thin bright cores + soft halo) instead of flat matte shapes.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9,   // strength
  0.55,  // radius
  0.18   // threshold — only bright emissive/glow elements bloom
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const sceneManager = new SceneManager(scene, (info) => {
  updateSceneInfo(info);
  background.setScene(info.key);
});

// ---------- gesture -> scene manager wiring ----------

connectGestureSocket({
  onStatusChange: setConnectionStatus,
  onEvent: (event) => {
    switch (event.type) {
      case "SWIPE_RIGHT":
        sceneManager.nextScene();
        flashGestureCursor("SWIPE");
        break;
      case "SWIPE_LEFT":
        sceneManager.prevScene();
        flashGestureCursor("SWIPE");
        break;
      case "PINCH_ZOOM":
        sceneManager.zoomBy(event.delta);
        flashGestureCursor("PINCH_ZOOM");
        break;
      case "ROTATE":
        sceneManager.rotateBy(event.delta_deg);
        flashGestureCursor("ROTATE");
        break;
      default:
        console.warn("[main] unknown event", event);
    }
  },
});

// ---------- keyboard fallback (handy while backend isn't running) ----------

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") sceneManager.nextScene();
  if (e.key === "ArrowLeft") sceneManager.prevScene();
  if (e.key === "ArrowUp") sceneManager.zoomBy(0.5);
  if (e.key === "ArrowDown") sceneManager.zoomBy(-0.5);
  if (e.key === "r") sceneManager.rotateBy(15);
});

// ---------- render loop ----------

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  sceneManager.update(dt);
  background.update(dt);

  composer.render();
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
});
