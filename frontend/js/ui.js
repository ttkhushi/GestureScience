const nameEl = document.getElementById("hud-object-name");
const levelEl = document.getElementById("hud-level");
const connEl = document.getElementById("hud-connection");
const dots = document.querySelectorAll("#hud-progress .dot");
const cursor = document.getElementById("gesture-cursor");

export function updateSceneInfo({ key, name, level, levelName }) {
  nameEl.textContent = name;
  levelEl.textContent = `LEVEL ${String(level).padStart(2, "0")}${levelName ? " — " + levelName : ""}`;
  dots.forEach((dot) => dot.classList.toggle("active", dot.dataset.scene === key));
}

export function setConnectionStatus(connected) {
  connEl.textContent = connected ? "backend connected" : "waiting for backend…";
  connEl.classList.toggle("connected", connected);
  connEl.classList.toggle("disconnected", !connected);
}

let cursorTimeout = null;
export function flashGestureCursor(kind) {
  cursor.style.opacity = "1";
  cursor.style.borderColor = kind === "PINCH_ZOOM" ? "#ffd27f" : kind === "ROTATE" ? "#c98fff" : "#7fb4ff";
  cursor.style.left = "50%";
  cursor.style.top = "50%";
  clearTimeout(cursorTimeout);
  cursorTimeout = setTimeout(() => { cursor.style.opacity = "0"; }, 350);
}
