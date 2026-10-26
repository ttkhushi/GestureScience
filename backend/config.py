"""
Central configuration for the GestureScience backend.
Tune these values first if gestures feel too sensitive / not sensitive enough.
"""

# ---------- Camera ----------
CAMERA_INDEX = 0            # change to 1/2 if you have multiple webcams
FRAME_WIDTH = 960
FRAME_HEIGHT = 540
FLIP_HORIZONTAL = True      # mirror image so movement feels natural

# ---------- MediaPipe Hands ----------
MAX_NUM_HANDS = 1
MIN_DETECTION_CONFIDENCE = 0.7
MIN_TRACKING_CONFIDENCE = 0.6

# ---------- Landmark smoothing ----------
SMOOTHING_ALPHA = 0.5       # exponential smoothing factor (0-1, higher = less smoothing)
HISTORY_LEN = 8              # number of frames kept for temporal gestures (swipe)

# ---------- Swipe detection ----------
SWIPE_MIN_DISTANCE = 0.18    # normalized (0-1) horizontal palm travel required
SWIPE_MIN_SPEED = 0.55       # normalized units / second
SWIPE_COOLDOWN_SEC = 0.8     # ignore new swipes for this long after one fires

# ---------- Pinch detection ----------
PINCH_CLOSE_THRESHOLD = 0.045   # thumb-index normalized distance considered "closed"
PINCH_OPEN_THRESHOLD = 0.09     # normalized distance considered "open"
PINCH_ZOOM_SENSITIVITY = 6.0    # multiplies distance-delta into zoom delta
PINCH_COOLDOWN_SEC = 0.05

# ---------- Rotation ----------
ROTATE_MIN_ANGLE_DELTA = 2.5     # degrees/frame threshold to count as intentional rotation
ROTATE_SENSITIVITY = 1.0

# ---------- WebSocket server ----------
WS_HOST = "localhost"
WS_PORT = 8765

# ---------- Debug ----------
SHOW_DEBUG_WINDOW = True     # OpenCV window with landmark overlay + gesture label
