/**
 * A meeting's shared state and the changes attendees make to it. The extension applies changes
 * locally and the sync server applies the same ones, so both always agree. `hello` carries the
 * attendee's cached state, which seeds a room the server doesn't have, so a lost or reset server
 * never wipes what attendees already set.
 *
 * People are opaque tokens (a hash of meeting code and display name), so the server never sees
 * a name. Done marks and the manual order belong to one day and are cleared when a newer day
 * arrives; the first/last/skip rules persist.
 *
 * @typedef {object} Rules
 * @property {string | null} first
 * @property {string | null} last
 * @property {string[]} skip
 *
 * @typedef {object} RoomState
 * @property {string} day YYYY-MM-DD
 * @property {string[]} done
 * @property {string[] | null} manualOrder
 * @property {Rules} rules
 *
 * @typedef {{ type: 'hello', day: string, state?: RoomState }
 *   | { type: 'mark', day: string, person: string, done: boolean }
 *   | { type: 'setDone', day: string, people: string[] }
 *   | { type: 'setOrder', day: string, order: string[] }
 *   | { type: 'setRules', rules: Rules }} Change
 */

const TOKEN = /^[0-9a-f]{64}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PEOPLE = 500;

/** @returns {RoomState} */
export function emptyState(day) {
  return { day, done: [], manualOrder: null, rules: { first: null, last: null, skip: [] } };
}

/**
 * @param {RoomState} state
 * @param {Change} change
 * @returns {RoomState}
 */
export function applyChange(state, change) {
  if ('day' in change && change.day < state.day) return state;
  const current =
    'day' in change && change.day > state.day
      ? { ...state, day: change.day, done: [], manualOrder: null }
      : state;

  switch (change.type) {
    case 'hello':
      return current;
    case 'mark': {
      const others = current.done.filter((person) => person !== change.person);
      return { ...current, done: change.done ? [...others, change.person] : others };
    }
    case 'setDone':
      return { ...current, done: unique(change.people) };
    case 'setOrder':
      return { ...current, manualOrder: unique(change.order) };
    case 'setRules':
      return {
        ...current,
        rules: { first: change.rules.first, last: change.rules.last, skip: unique(change.rules.skip) },
      };
  }
}

/** Boundary check for changes arriving from the network. */
export function isValidChange(change) {
  if (typeof change !== 'object' || change === null) return false;
  const hasDay = typeof change.day === 'string' && DAY.test(change.day);
  switch (change.type) {
    case 'hello':
      return hasDay && (change.state === undefined || isValidState(change.state));
    case 'mark':
      return hasDay && isToken(change.person) && typeof change.done === 'boolean';
    case 'setDone':
      return hasDay && isTokenList(change.people);
    case 'setOrder':
      return hasDay && isTokenList(change.order);
    case 'setRules':
      return isValidRules(change.rules);
    default:
      return false;
  }
}

function isValidState(state) {
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof state.day === 'string' &&
    DAY.test(state.day) &&
    isTokenList(state.done) &&
    (state.manualOrder === null || isTokenList(state.manualOrder)) &&
    isValidRules(state.rules)
  );
}

function isValidRules(rules) {
  return (
    typeof rules === 'object' &&
    rules !== null &&
    (rules.first === null || isToken(rules.first)) &&
    (rules.last === null || isToken(rules.last)) &&
    isTokenList(rules.skip)
  );
}

function isToken(value) {
  return typeof value === 'string' && TOKEN.test(value);
}

function isTokenList(value) {
  return Array.isArray(value) && value.length <= MAX_PEOPLE && value.every(isToken);
}

function unique(list) {
  return [...new Set(list)];
}
