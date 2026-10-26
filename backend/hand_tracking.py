"""
Thin wrapper around MediaPipe's Hand Landmarker task.

NOTE: MediaPipe removed the old `mp.solutions.hands` ("legacy Solutions")
API in recent releases (mediapipe >= 1.0). This wrapper uses the new
Tasks API (`mediapipe.tasks.python.vision.HandLandmarker`) instead, which
is the currently supported way to do hand tracking. It needs a small
model file (hand_landmarker.task), which this module downloads
automatically the first time you run it.

Responsibilities:
- Run the HandLandmarker on a BGR frame.
- Return normalized landmarks (x, y, z in [0,1]) for the first detected hand.
- Provide a few derived convenience points (palm center, thumb tip, index tip).

Keeping this isolated means gesture_recognition.py never has to know
anything about MediaPipe's API — if MediaPipe changes again, only this
file changes.
"""

import os
import urllib.request

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

import config

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task")

# Standard 21-point MediaPipe hand skeleton connections (stable across versions).
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),            # thumb
    (0, 5), (5, 6), (6, 7), (7, 8),            # index
    (5, 9), (9, 10), (10, 11), (11, 12),       # middle
    (9, 13), (13, 14), (14, 15), (15, 16),     # ring
    (13, 17), (17, 18), (18, 19), (19, 20),    # pinky
    (0, 17),
]


def _ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print("[hand_tracking] downloading hand_landmarker.task model (one-time, a few MB)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("[hand_tracking] model downloaded ->", MODEL_PATH)


class HandTracker:
    def __init__(self):
        _ensure_model()
        base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=config.MAX_NUM_HANDS,
            min_hand_detection_confidence=config.MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=config.MIN_TRACKING_CONFIDENCE,
            running_mode=vision.RunningMode.VIDEO,
        )
        self._landmarker = vision.HandLandmarker.create_from_options(options)
        self._timestamp_ms = 0

    def process(self, frame_rgb):
        """
        Returns a dict with landmark info for the first hand, or None if no hand found.

        {
            "landmarks": np.ndarray shape (21, 3)  # x, y, z normalized
            "palm_center": (x, y)
            "thumb_tip": (x, y)
            "index_tip": (x, y)
            "wrist": (x, y)
            "raw": list of 21 landmark objects (for drawing)
        }
        """
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(frame_rgb))

        # VIDEO mode requires strictly increasing timestamps; ~33ms ≈ 30fps.
        self._timestamp_ms += 33
        result = self._landmarker.detect_for_video(mp_image, self._timestamp_ms)

        if not result.hand_landmarks:
            return None

        hand_landmarks = result.hand_landmarks[0]
        pts = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks])

        palm_ids = [0, 5, 9, 13, 17]
        palm_center = pts[palm_ids, :2].mean(axis=0)

        return {
            "landmarks": pts,
            "palm_center": tuple(palm_center),
            "thumb_tip": tuple(pts[4, :2]),
            "index_tip": tuple(pts[8, :2]),
            "wrist": tuple(pts[0, :2]),
            "raw": hand_landmarks,
        }

    def draw(self, frame_bgr, raw_landmarks):
        """Draw the hand skeleton onto a frame (for the debug window)."""
        h, w = frame_bgr.shape[:2]
        pts_px = [(int(lm.x * w), int(lm.y * h)) for lm in raw_landmarks]

        for a, b in HAND_CONNECTIONS:
            cv2.line(frame_bgr, pts_px[a], pts_px[b], (255, 180, 143), 2)
        for (x, y) in pts_px:
            cv2.circle(frame_bgr, (x, y), 4, (255, 214, 127), -1)

    def close(self):
        self._landmarker.close()
