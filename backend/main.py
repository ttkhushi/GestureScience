"""
Entry point for the GestureScience backend.

Run with:  python main.py

What happens:
1. A background thread opens the webcam, runs MediaPipe hand tracking,
   feeds landmarks into the rule-based GestureRecognizer, and pushes any
   fired gesture events into the WebSocket server's queue.
2. The main thread runs the asyncio WebSocket server, which broadcasts
   those events to any connected Three.js frontend (open frontend/index.html
   in a browser).

Press 'q' in the debug window (or Ctrl+C in the terminal) to quit.
"""

import asyncio
import threading
import time

import cv2

import config
from hand_tracking import HandTracker
from gesture_recognition import GestureRecognizer
from server import GestureServer


def camera_loop(server: GestureServer, stop_event: threading.Event):
    cap = cv2.VideoCapture(config.CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT)

    if not cap.isOpened():
        print("[camera] ERROR: could not open webcam. Check config.CAMERA_INDEX.")
        stop_event.set()
        return

    tracker = HandTracker()
    recognizer = GestureRecognizer()

    print("[camera] running. Press 'q' in the debug window to quit.")

    try:
        while not stop_event.is_set():
            ok, frame = cap.read()
            if not ok:
                continue

            if config.FLIP_HORIZONTAL:
                frame = cv2.flip(frame, 1)

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            hand_data = tracker.process(frame_rgb)

            events = recognizer.update(hand_data)
            for event in events:
                server.push_event(event)
                print(f"[gesture] {event}")

            if config.SHOW_DEBUG_WINDOW:
                if hand_data is not None:
                    tracker.draw(frame, hand_data["raw"])
                cv2.putText(
                    frame, f"state: {recognizer.state}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2,
                )
                cv2.imshow("GestureScience - debug", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    stop_event.set()
                    break
    finally:
        cap.release()
        tracker.close()
        cv2.destroyAllWindows()


async def main_async():
    server = GestureServer()
    stop_event = threading.Event()

    cam_thread = threading.Thread(target=camera_loop, args=(server, stop_event), daemon=True)
    cam_thread.start()

    # give the camera thread a beat before we start printing server logs
    time.sleep(0.2)

    server_task = asyncio.create_task(server.run())

    try:
        while not stop_event.is_set():
            await asyncio.sleep(0.1)
    finally:
        server_task.cancel()


if __name__ == "__main__":
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        print("\n[main] shutting down.")
