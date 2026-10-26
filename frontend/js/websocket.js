const WS_URL = "ws://localhost:8765";
const RECONNECT_DELAY_MS = 1500;

export function connectGestureSocket({ onEvent, onStatusChange }) {
  let socket = null;

  function connect() {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => onStatusChange(true);
    socket.onclose = () => {
      onStatusChange(false);
      setTimeout(connect, RECONNECT_DELAY_MS);
    };
    socket.onerror = () => socket.close();

    socket.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        onEvent(event);
      } catch (e) {
        console.warn("[ws] bad message", msg.data);
      }
    };
  }

  connect();
}
