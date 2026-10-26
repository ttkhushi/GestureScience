# Phase 5 — Trained gesture classifier (not yet implemented)

This folder is where a trained classifier's weights/pickles would live once
you replace the rule-based logic in `backend/gesture_recognition.py`.

Planned pipeline (see the project's stored spec for full detail):

```
MediaPipe landmarks
        ↓
Feature extraction (finger distances, joint angles — normalized)
        ↓
Static gestures (IDLE, PINCH)  →  Random Forest / MLP  (scikit-learn)
Temporal gestures (SWIPE, ROTATE) → LSTM/GRU over a landmark sequence (PyTorch)
        ↓
Gesture label → same WebSocket event format used today
```

Suggested next scripts (not yet written):
- `dataset/collect.py` — records labeled landmark samples from the webcam
  into `dataset/*.csv` (500–1000 samples per gesture as a starting point)
- `train_static.py` — trains the Random Forest/MLP classifier on single-frame
  features, saves to `models/static_classifier.pkl`
- `train_temporal.py` — trains the LSTM/GRU on landmark sequences, saves to
  `models/temporal_classifier.pt`
- `evaluate.py` — reports accuracy/precision/recall/F1 + confusion matrix on
  a held-out test split (70/15/15 train/val/test)

Once trained, `gesture_recognition.py`'s `GestureRecognizer.update()` can be
swapped to call the model instead of the threshold checks — the rest of the
backend (server.py, main.py) and the entire frontend need no changes, since
they only ever see the same `{"type": "SWIPE_RIGHT"}`-style event dicts.
