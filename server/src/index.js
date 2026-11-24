/**
 * Turnly sync server. Each meeting is a room, a Durable Object holding the room state and the
 * WebSockets of attendees in it. Every valid change is applied and the new state is sent to
 * everyone in the room. Room ids and people are hashes made in the browser, so nothing here can
 * tell which meeting or which person it is.
 */
import { DurableObject } from 'cloudflare:workers';

import { applyChange, emptyState, isValidChange } from '../../src/room-state.js';

const ROOM_PATH = /^\/rooms\/([0-9a-f]{64})$/;
const ALLOWED_ORIGINS = /^(https:\/\/meet\.google\.com|chrome-extension:\/\/[a-p]{32}|moz-extension:\/\/[0-9a-f-]{36})$/;
const MAX_MESSAGE_BYTES = 256 * 1024;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export default {
  async fetch(request, env) {
    const roomId = new URL(request.url).pathname.match(ROOM_PATH)?.[1];
    if (!roomId) return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 });
    }
    if (!ALLOWED_ORIGINS.test(request.headers.get('Origin') ?? '')) {
      return new Response('Forbidden', { status: 403 });
    }
    return env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(request);
  },
};

export class Room extends DurableObject {
  async fetch() {
    const { 0: client, 1: server } = new WebSocketPair();
    // Hibernation keeps idle rooms free: the object sleeps between messages.
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket, message) {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_BYTES) return;
    let change;
    try {
      change = JSON.parse(message);
    } catch {
      return;
    }
    if (!isValidChange(change)) return;

    const stored = await this.ctx.storage.get('state');
    const next = applyChange(stored ?? change.state ?? emptyState(change.day ?? ''), change);
    if (next !== stored) {
      await this.ctx.storage.put('state', next);
      await this.ctx.storage.setAlarm(Date.now() + RETENTION_MS);
    }

    const update = JSON.stringify({ type: 'state', state: next });
    if (change.type === 'hello' && next === stored) socket.send(update);
    else for (const peer of this.ctx.getWebSockets()) peer.send(update);
  }

  /** Forgets rooms nobody has changed for the retention period. */
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
