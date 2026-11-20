/**
 * Done marks for the current meeting, saved per meeting and per day in `chrome.storage.local`.
 * Marks are keyed by Meet's participant id, so people sharing a display name stay independent.
 */

const STORAGE_PREFIX = 'turnly:';
const MEETING_CODE = /^\/([a-z]{3}-[a-z]{4}-[a-z]{3})\b/;

let meetingPath = null;
let storageKey = null;
/** @type {Map<string, string>} participant id → display name */
let done = new Map();

/** Switches to the marks of the meeting at `pathname`. Cheap no-op while the path is unchanged. */
export function syncMeeting(pathname) {
  if (pathname === meetingPath) return;
  meetingPath = pathname;
  const code = pathname.match(MEETING_CODE)?.[1];
  storageKey = code ? `${STORAGE_PREFIX}${code}:${today()}` : null;
  done = new Map();
  if (storageKey) load(storageKey);
}

/** Seed for the speaking order: the same for every attendee of this meeting today. */
export function seed() {
  return storageKey ?? '';
}

export function isDone(id) {
  return done.has(id);
}

export function toggle(id, name) {
  if (done.has(id)) done.delete(id);
  else done.set(id, name);
  save();
}

export function reset() {
  done.clear();
  save();
}

/**
 * Rejoining gives a participant a new id. A not-done participant inherits the mark of a
 * same-name id that is no longer in the meeting.
 *
 * @param {import('./participants.js').Participant[]} participants
 * @param {Set<string>} presentIds every participant id currently in the DOM
 */
export function adoptRejoined(participants, presentIds) {
  for (const { id, name } of participants) {
    if (done.has(id)) continue;
    const departedId = [...done.keys()].find(
      (doneId) => done.get(doneId) === name && !presentIds.has(doneId),
    );
    if (departedId === undefined) continue;
    done.delete(departedId);
    done.set(id, name);
    save();
  }
}

/** Deletes marks saved on previous days. */
export async function pruneOtherDays() {
  const all = await chrome.storage.local.get(null);
  const todaySuffix = `:${today()}`;
  const stale = Object.keys(all).filter(
    (key) => key.startsWith(STORAGE_PREFIX) && !key.endsWith(todaySuffix),
  );
  if (stale.length > 0) await chrome.storage.local.remove(stale);
}

function today() {
  return new Date().toLocaleDateString('en-CA');
}

async function load(key) {
  const stored = await chrome.storage.local.get(key);
  if (key !== storageKey) return;
  for (const [id, name] of Object.entries(stored[key] ?? {})) done.set(id, name);
}

function save() {
  chrome.storage.local.set({ [storageKey]: Object.fromEntries(done) });
}
