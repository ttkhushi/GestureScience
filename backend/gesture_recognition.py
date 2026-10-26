"""
Rule-based gesture recognizer.

This module is deliberately isolated behind a single method — `update()` —
so that later it can be swapped for a trained ML classifier (Random Forest /
MLP for static gestures, LSTM/GRU for temporal ones) without touching
main.py, server.py, or the frontend at all. See models/README.md for the
planned ML upgrade path.

State machine (per project spec):

    IDLE -> HAND_DETECTED -> GESTURE_ACTIVE -> {SWIPE, PINCH, ROTATE} -> ACTION -> COOLDOWN -> IDLE

We approximate this with a lightweight class that keeps a short history of
palm positions / pinch distances / hand angle, and fires at most one
gesture event per relevant cooldown window so gestures don't get
double-counted or conflict with one another.
"""

import math
import time
from collections import deque

import numpy as np

import config


class GestureRecognizer:
    def __init__(self):
        self.state = "IDLE"

        self._history = deque(maxlen=config.HISTORY_LEN)   # (t, palm_x, palm_y)
        self._smoothed_palm = None
        self._smoothed_pinch_dist = None

        self._last_swipe_time = 0.0
        self._last_pinch_dist = None
        self._last_angle = None

    # ---------- public API ----------

    def update(self, hand_data):
        """
        Call once per frame.
        hand_data: dict from HandTracker.process(), or None if no hand visible.

        Returns a list of gesture command dicts to send to the frontend, e.g.:
            [{"type": "SWIPE_LEFT"}]
            [{"type": "PINCH_ZOOM", "delta": 0.03}]
            [{"type": "ROTATE", "delta_deg": 4.2}]
        A frame can also produce zero events (nothing crossed a threshold).
        """
        now = time.time()

        if hand_data is None:
            self.state = "IDLE"
            self._history.clear()
            self._smoothed_palm = None
            self._smoothed_pinch_dist = None
            self._last_pinch_dist = None
            self._last_angle = None
            return []

        self.state = "HAND_DETECTED"
        events = []

        palm = np.array(hand_data["palm_center"])
        self._smoothed_palm = self._smooth(self._smoothed_palm, palm)
        self._history.append((now, *self._smoothed_palm))

        # ---- Pinch distance (thumb tip <-> index tip) ----
        thumb = np.array(hand_data["thumb_tip"])
        index = np.array(hand_data["index_tip"])
        pinch_dist = float(np.linalg.norm(thumb - index))
        self._smoothed_pinch_dist = self._smooth_scalar(self._smoothed_pinch_dist, pinch_dist)

        pinch_event = self._check_pinch(now)
        if pinch_event:
            self.state = "GESTURE_ACTIVE"
            events.append(pinch_event)

        # ---- Swipe (only when not actively pinching, to avoid gesture conflicts) ----
        if not pinch_event:
            swipe_event = self._check_swipe(now)
            if swipe_event:
                self.state = "GESTURE_ACTIVE"
                events.append(swipe_event)

        # ---- Rotation (angle of wrist->middle-finger-MCP vector) ----
        rotate_event = self._check_rotation(hand_data)
        if rotate_event and not pinch_event:
            self.state = "GESTURE_ACTIVE"
            events.append(rotate_event)

        if events:
            self.state = "COOLDOWN"
        else:
            self.state = "HAND_DETECTED"

        return events

    # ---------- internals ----------

    @staticmethod
    def _smooth(prev, new_point):
        if prev is None:
            return new_point
        a = config.SMOOTHING_ALPHA
        return a * new_point + (1 - a) * prev

    @staticmethod
    def _smooth_scalar(prev, new_val):
        if prev is None:
            return new_val
        a = config.SMOOTHING_ALPHA
        return a * new_val + (1 - a) * prev

    def _check_swipe(self, now):
        if now - self._last_swipe_time < config.SWIPE_COOLDOWN_SEC:
            return None
        if len(self._history) < config.HISTORY_LEN:
            return None

        t0, x0, _ = self._history[0]
        t1, x1, _ = self._history[-1]
        dt = max(t1 - t0, 1e-6)
        dx = x1 - x0
        speed = dx / dt

        if abs(dx) < config.SWIPE_MIN_DISTANCE:
            return None
        if abs(speed) < config.SWIPE_MIN_SPEED:
            return None

        self._last_swipe_time = now
        self._history.clear()
        # Frame is mirrored (config.FLIP_HORIZONTAL), so moving hand to the
        # viewer's right increases x -> treat as "swipe right" (next scene).
        direction = "SWIPE_RIGHT" if dx > 0 else "SWIPE_LEFT"
        return {"type": direction}

    def _check_pinch(self, now):
        dist = self._smoothed_pinch_dist
        if dist is None:
            return None
        if self._last_pinch_dist is None:
            self._last_pinch_dist = dist
            return None

        delta = self._last_pinch_dist - dist  # positive => fingers closing => zoom out
        self._last_pinch_dist = dist

        # Ignore tiny jitter
        if abs(delta) < 0.0015:
            return None

        zoom_delta = -delta * config.PINCH_ZOOM_SENSITIVITY  # fingers apart -> zoom in (+)
        return {"type": "PINCH_ZOOM", "delta": round(float(zoom_delta), 4)}

    def _check_rotation(self, hand_data):
        wrist = np.array(hand_data["wrist"])
        middle_mcp = np.array(hand_data["landmarks"][9, :2])
        vec = middle_mcp - wrist
        angle = math.degrees(math.atan2(vec[1], vec[0]))

        if self._last_angle is None:
            self._last_angle = angle
            return None

        delta = angle - self._last_angle
        # normalize to [-180, 180]
        delta = (delta + 180) % 360 - 180
        self._last_angle = angle

        if abs(delta) < config.ROTATE_MIN_ANGLE_DELTA:
            return None

        return {"type": "ROTATE", "delta_deg": round(delta * config.ROTATE_SENSITIVITY, 2)}
