"""
WebSocket broadcast server.

The camera/gesture loop runs in a background thread (OpenCV + MediaPipe are
blocking, synchronous libraries). This module runs the asyncio websocket
server on the main thread and exposes a thread-safe `push_event()` that the
camera thread calls to hand off a gesture event for broadcasting.
"""

import asyncio
import json

import websockets

import config


class GestureServer:
    def __init__(self):
        self._clients = set()
        self._loop = None
        self._queue: asyncio.Queue | None = None

    async def _handler(self, websocket):
        self._clients.add(websocket)
        print(f"[server] frontend connected ({len(self._clients)} total)")
        try:
            async for _ in websocket:
                pass  # frontend doesn't send anything back for now
        finally:
            self._clients.discard(websocket)
            print(f"[server] frontend disconnected ({len(self._clients)} total)")

    async def _broadcaster(self):
        while True:
            event = await self._queue.get()
            if not self._clients:
                continue
            payload = json.dumps(event)
            await asyncio.gather(
                *[ws.send(payload) for ws in list(self._clients)],
                return_exceptions=True,
            )

    async def run(self):
        self._loop = asyncio.get_running_loop()
        self._queue = asyncio.Queue()

        async with websockets.serve(self._handler, config.WS_HOST, config.WS_PORT):
            print(f"[server] listening on ws://{config.WS_HOST}:{config.WS_PORT}")
            await self._broadcaster()

    def push_event(self, event: dict):
        """Thread-safe: call this from the camera/gesture thread."""
        if self._loop is None or self._queue is None:
            return  # server not started yet
        self._loop.call_soon_threadsafe(self._queue.put_nowait, event)
