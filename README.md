# GestureScience

Gesture-controlled scientific visualization: **Brain → DNA → Cosmic Web → Earth**,
navigated entirely with hand gestures in front of a normal webcam.

- **Backend (Python)**: webcam capture, MediaPipe hand tracking, rule-based
  gesture recognition, WebSocket broadcast.
- **Frontend (Three.js, browser)**: 3D scenes, zoom hierarchy, transitions,
  dynamic backgrounds, minimal HUD.

They talk over a local WebSocket (`ws://localhost:8765`) — the Python side
never touches rendering, and the browser side never touches the webcam.

```
📷 Webcam → Python (MediaPipe + gesture recognizer) → WebSocket → Three.js (rendering)
```

## 1. Install

```bash
cd GestureScience
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Requires Python 3.9–3.11 (MediaPipe does not yet support very new Python
versions on every platform — check MediaPipe's release notes if `pip install`
fails).

## 2. Run the backend

```bash
cd backend
python main.py
```

You should see:
```
[server] listening on ws://localhost:8765
[camera] running. Press 'q' in the debug window to quit.
```
A debug OpenCV window opens showing your webcam feed with the hand skeleton
drawn on it, plus the current gesture state — useful for tuning thresholds
in `config.py`.

## 3. Run the frontend

Open `frontend/index.html` directly in a modern browser (Chrome/Edge/Firefox),
or serve it locally (recommended, some browsers restrict ES module imports
from `file://`):

```bash
cd frontend
python -m http.server 5500
# then open http://localhost:5500
```

The HUD in the top-right shows the WebSocket connection status. Once the
backend is running, it should say "backend connected".

**No webcam handy right now?** Use the keyboard fallback baked into
`main.js`: Left/Right arrows swipe, Up/Down arrows zoom, `r` rotates.

## 4. Gestures

| Gesture | Effect |
|---|---|
| Swipe hand left → right | Next scene (Brain → DNA → Cosmic Web → Earth → loops) |
| Swipe hand right → left | Previous scene |
| Pinch thumb + index apart | Zoom in / reveal deeper structure |
| Pinch thumb + index together | Zoom out |
| Rotate hand (twist wrist) | Rotate the current object |

Keep your hand ~30–60cm from the webcam, well lit, inside the frame.

## 5. How the scene hierarchy works

Each scene (`frontend/js/scenes/*.js`) exposes 5 zoom levels via
`setZoomLevel(level)`:

- **Brain**: whole brain → lobes → neurons → synapses → neural network
- **DNA**: double helix → closer helix → base pairs (A-T / G-C) → nucleotide → molecular detail
- **Cosmic Web**: cosmic web → galaxy clusters → galaxy → Milky Way → Solar System (all 8 planets)
- **Earth**: whole Earth → continents → region → environmental detail

`sceneManager.js` owns the current scene index and zoom level, and animates
smooth transitions (the incoming object moves from background to foreground
while the outgoing one recedes) instead of hard-cutting between scenes.

## 6. Project structure

```
GestureScience/
├── backend/
│   ├── main.py               # entry point: camera thread + websocket server
│   ├── config.py              # all tunable thresholds live here
│   ├── hand_tracking.py       # MediaPipe wrapper
│   ├── gesture_recognition.py # rule-based gesture state machine
│   └── server.py              # WebSocket broadcast server
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── main.js            # Three.js setup + render loop
│       ├── sceneManager.js    # scene switching, zoom, transitions
│       ├── background.js      # dynamic per-scene background
│       ├── ui.js               # HUD updates
│       ├── websocket.js       # WebSocket client
│       └── scenes/
│           ├── brain.js
│           ├── dna.js
│           ├── cosmicWeb.js
│           └── earth.js
├── dataset/                   # (empty) — for ML phase, see models/README.md
├── models/                    # (empty) — trained gesture classifiers go here
└── requirements.txt
```

## 7. Current status vs. the full spec

Implemented now (Phases 1–4 of the project plan):
- Real webcam → MediaPipe → rule-based gesture recognition → WebSocket → Three.js pipeline
- All 4 scenes with procedural 3D geometry (no external assets required)
- Swipe / pinch-zoom / rotate gestures with smoothing + cooldowns
- 5-level zoom hierarchy per scene, dynamic per-scene backgrounds, minimal HUD, gesture cursor feedback

Not yet implemented (Phase 5, optional upgrade):
- Trained ML gesture classifier (Random Forest/MLP for static gestures,
  LSTM/GRU for swipe/rotate) to replace the rule-based recognizer — see
  `models/README.md` for the planned pipeline.
- Realistic textured 3D assets (currently procedural placeholder geometry,
  as allowed by the original spec's fallback rule).

## 8. Troubleshooting

- **"could not open webcam"** → change `CAMERA_INDEX` in `backend/config.py`
  (try 0, 1, 2), and make sure no other app is using the camera.
- **Gestures too sensitive / not sensitive enough** → tune the thresholds in
  `backend/config.py` (`SWIPE_MIN_DISTANCE`, `PINCH_CLOSE_THRESHOLD`, etc.).
- **Frontend says "waiting for backend…" forever** → make sure `python
  main.py` is running and printed `listening on ws://localhost:8765`, and
  that no firewall is blocking localhost websockets.
- **Browser blocks module imports** → serve `frontend/` with `python -m
  http.server` instead of opening `index.html` via `file://`.
- **Low FPS on the webcam feed** → lower `FRAME_WIDTH`/`FRAME_HEIGHT` in
  `config.py`, or set `SHOW_DEBUG_WINDOW = False` once gestures are tuned.
