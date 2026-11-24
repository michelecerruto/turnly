/**
 * State of the current meeting, the single place that reads and writes it.
 *
 * - The room state (done marks and manual order for today, first/last/skip rules) is shared with
 *   every attendee through the sync server, and cached in `chrome.storage.local` so Turnly keeps
 *   working offline. People are identified by display name, the one thing every attendee sees
 *   the same, hashed with the meeting code so the server never sees a name.
 * - Whether Turnly shows in a meeting is a personal choice, kept in `chrome.storage.sync`. Nothing
 *   is sent in meetings where it is off.
 */
import { applyChange, emptyState } from './room-state.js';
import { connectRoom, sha256 } from './sync.js';

const ROOM_PREFIX = 'room:';
const SETTINGS_PREFIX = 'meeting:';
const LEGACY_PREFIX = 'turnly:';
const MEETING_CODE = /^\/([a-z]{3}-[a-z]{4}-[a-z]{3})\b/;

let meetingPath = null;
let code = null;
let day = null;
let loaded = false;
let enabled = false;
/** @type {import('./room-state.js').RoomState} */
let state = emptyState('');
/** @type {ReturnType<typeof connectRoom> | null} */
let room = null;
let roomId = null;
/** @type {Map<string, string>} display name → token */
let tokens = new Map();
/** @type {Map<string, string>} token → display name */
let names = new Map();
/** Names whose token is still being computed. */
let hashing = new Set();
/** Marks cleared by the last reset, until undone. */
let resetMarks = null;

/** Switches to the meeting at `pathname`. Cheap no-op while the path is unchanged. */
export function syncMeeting(pathname) {
  if (pathname === meetingPath) return;
  meetingPath = pathname;
  room?.close();
  room = null;
  roomId = null;
  code = pathname.match(MEETING_CODE)?.[1] ?? null;
  day = today();
  loaded = false;
  enabled = false;
  state = emptyState(day);
  tokens = new Map();
  names = new Map();
  hashing = new Set();
  resetMarks = null;
  if (code) load(code);
}

export function meetingCode() {
  return code;
}

/** False until the meeting's state has loaded, so nothing flashes in meetings where it's off. */
export function isEnabled() {
  return loaded && enabled;
}

export function setEnabled(value) {
  enabled = value;
  chrome.storage.sync.set({ [`${SETTINGS_PREFIX}${code}`]: { enabled } });
  updateConnection();
}

export function isSynced() {
  return room?.isConnected() ?? false;
}

/** Seed for the shuffle: the same for every attendee of this meeting today, and as in 1.0. */
export function seed() {
  return `${LEGACY_PREFIX}${code}:${day}`;
}

/**
 * Starts hashing names not seen yet. Returns whether every name is ready, since marks and
 * rules can only be matched to people whose token is known.
 *
 * @param {string[]} displayNames
 */
export function prepare(displayNames) {
  let ready = true;
  for (const name of displayNames) {
    if (tokens.has(name)) continue;
    ready = false;
    if (hashing.has(name)) continue;
    hashing.add(name);
    const meeting = code;
    sha256(`${meeting}\n${name}`).then((token) => {
      if (code !== meeting) return;
      hashing.delete(name);
      tokens.set(name, token);
      names.set(token, name);
    });
  }
  return ready;
}

/** @returns {Omit<import('./order.js').OrderRules, 'seed'>} rules in display names */
export function orderRules() {
  const { rules, manualOrder } = state;
  return {
    first: names.get(rules.first) ?? null,
    last: names.get(rules.last) ?? null,
    skip: knownNames(rules.skip),
    manualOrder: manualOrder && knownNames(manualOrder),
  };
}

export function isDone(name) {
  return state.done.includes(tokens.get(name));
}

export function toggle(name) {
  resetMarks = null;
  change({ type: 'mark', day, person: tokens.get(name), done: !isDone(name) });
}

export function reset() {
  resetMarks = state.done;
  change({ type: 'setDone', day, people: [] });
}

export function undoReset() {
  if (!resetMarks) return;
  change({ type: 'setDone', day, people: resetMarks });
  resetMarks = null;
}

/** @param {string[]} order everyone in the queue, in the order chosen for today */
export function setManualOrder(order) {
  change({ type: 'setOrder', day, order: order.map((name) => tokens.get(name)) });
}

export function toggleFirst(name) {
  const person = tokens.get(name);
  const { first, last, skip } = state.rules;
  setRules({ first: first === person ? null : person, last: last === person ? null : last, skip });
}

export function toggleLast(name) {
  const person = tokens.get(name);
  const { first, last, skip } = state.rules;
  setRules({ first: first === person ? null : first, last: last === person ? null : person, skip });
}

export function toggleSkip(name) {
  const person = tokens.get(name);
  const { skip } = state.rules;
  setRules({
    ...state.rules,
    skip: skip.includes(person) ? skip.filter((skipped) => skipped !== person) : [...skip, person],
  });
}

function setRules(rules) {
  change({ type: 'setRules', rules });
}

/** @param {import('./room-state.js').Change} roomChange */
function change(roomChange) {
  state = applyChange(state, roomChange);
  saveRoom();
  room?.send(roomChange);
}

function knownNames(people) {
  return people.map((person) => names.get(person)).filter(Boolean);
}

function today() {
  return new Date().toLocaleDateString('en-CA');
}

async function load(meeting) {
  const roomKey = `${ROOM_PREFIX}${meeting}`;
  const settingsKey = `${SETTINGS_PREFIX}${meeting}`;
  const legacyKey = `${LEGACY_PREFIX}${meeting}:${day}`;
  const [local, synced, id] = await Promise.all([
    chrome.storage.local.get([roomKey, legacyKey]),
    chrome.storage.sync.get(settingsKey),
    sha256(`room\n${meeting}`),
  ]);
  if (code !== meeting) return;

  state = applyChange(local[roomKey] ?? emptyState(day), { type: 'hello', day });
  const legacyMarks = await legacyDone(meeting, local[legacyKey]);
  if (code !== meeting) return;
  if (legacyMarks.length > 0) state = applyChange(state, { type: 'setDone', day, people: legacyMarks });

  roomId = id;
  // Meetings that already used Turnly 1.0 today stay on.
  enabled = synced[settingsKey]?.enabled ?? legacyMarks.length > 0;
  loaded = true;
  updateConnection();
  removeLegacyMarks(legacyKey);
}

/** Turnly 1.0 saved today's marks as participant id → display name. */
async function legacyDone(meeting, marks) {
  const legacyNames = Object.values(marks ?? {});
  return Promise.all(legacyNames.map((name) => sha256(`${meeting}\n${name}`)));
}

/** Keeps other meetings' 1.0 marks from today, so they can still be carried over there. */
async function removeLegacyMarks(migratedKey) {
  const all = await chrome.storage.local.get(null);
  const legacy = Object.keys(all).filter(
    (key) => key === migratedKey || (key.startsWith(LEGACY_PREFIX) && !key.endsWith(`:${day}`)),
  );
  if (legacy.length > 0) await chrome.storage.local.remove(legacy);
}

function updateConnection() {
  const shouldConnect = loaded && enabled && roomId !== null;
  if (shouldConnect && !room) {
    room = connectRoom(roomId, { hello: () => ({ type: 'hello', day, state }), onState: receiveState });
  }
  if (!shouldConnect && room) {
    room.close();
    room = null;
  }
}

function receiveState(roomState) {
  if (roomState.day < day) return;
  state = roomState;
  saveRoom();
}

function saveRoom() {
  if (!code) return;
  chrome.storage.local.set({ [`${ROOM_PREFIX}${code}`]: state });
}
