/**
 * Connection to the meeting's room on the sync server. Turnly never depends on it: every change is
 * applied and saved locally first, changes made while offline are queued and sent, in order, once
 * the connection is back, and the server answers with the room state.
 */

const SERVER_URL = 'wss://turnly.turnly-server.workers.dev';
const MAX_RETRY_MS = 30_000;

/**
 * @param {string} roomId
 * @param {object} options
 * @param {() => import('./room-state.js').Change} options.hello sent first on every connection
 * @param {(state: import('./room-state.js').RoomState) => void} options.onState
 */
export function connectRoom(roomId, { hello, onState }) {
  /** @type {import('./room-state.js').Change[]} */
  const pending = [];
  /** @type {WebSocket | null} */
  let socket = null;
  let retryMs = 1000;
  let retryTimer = null;
  let closed = false;

  function open() {
    try {
      socket = new WebSocket(`${SERVER_URL}/rooms/${roomId}`);
    } catch {
      // Some browsers refuse the connection synchronously, for example under a stricter page policy.
      socket = null;
      retry();
      return;
    }
    socket.addEventListener('open', () => {
      retryMs = 1000;
      socket.send(JSON.stringify(hello()));
      while (pending.length > 0) socket.send(JSON.stringify(pending.shift()));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'state') onState(message.state);
    });
    socket.addEventListener('close', retry);
  }

  function retry() {
    if (closed) return;
    retryTimer = setTimeout(open, retryMs);
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
  }

  function isOpen() {
    return socket?.readyState === WebSocket.OPEN;
  }

  open();
  return {
    /** @param {import('./room-state.js').Change} change */
    send(change) {
      if (isOpen()) socket.send(JSON.stringify(change));
      else pending.push(change);
    },
    isConnected: isOpen,
    close() {
      closed = true;
      clearTimeout(retryTimer);
      socket?.close();
    },
  };
}

/** Hex SHA-256 of `text`. Used for room ids and people, so the server never sees names. */
export async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
