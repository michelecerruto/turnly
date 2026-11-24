/**
 * The speaking order. Ranking each person by a hash of `seed` + name gives a daily shuffle that
 * is identical on every attendee's machine and that joins or leaves never reorder. Rules pin
 * people first or last, or skip them; a manual order set today reorders everyone in between.
 *
 * @typedef {object} OrderRules
 * @property {string} seed changes per meeting and per day
 * @property {string | null} first name of who always speaks first
 * @property {string | null} last name of who always speaks last
 * @property {string[]} skip names of who never takes a turn
 * @property {string[] | null} manualOrder names in the order set by hand today
 */

/**
 * @template {{ id: string, name: string }} T
 * @param {T[]} participants one entry per participant
 * @param {OrderRules} rules
 * @returns {{ queue: T[], skipped: T[] }}
 */
export function speakingOrder(participants, { seed, first, last, skip, manualOrder }) {
  const skipped = participants.filter((participant) => skip.includes(participant.name));
  const shuffled = participants
    .filter((participant) => !skip.includes(participant.name))
    .sort((a, b) => rank(seed, a.name) - rank(seed, b.name) || a.id.localeCompare(b.id));
  const head = shuffled.filter((participant) => participant.name === first);
  const tail = shuffled.filter((participant) => participant.name === last);
  const middle = shuffled.filter((participant) => participant.name !== first && participant.name !== last);
  const ordered = manualOrder ? applyManualOrder(middle, manualOrder) : middle;
  return { queue: [...head, ...ordered, ...tail], skipped };
}

/** Returns `names` with the entry at `index` swapped with its neighbour `delta` steps away. */
export function moveName(names, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= names.length) return names;
  const moved = [...names];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

/**
 * People in `manualOrder` take its positions. Anyone else, such as a late joiner, goes just
 * before the next person who follows them in the shuffled order.
 */
function applyManualOrder(shuffled, manualOrder) {
  const position = new Map(manualOrder.map((name, index) => [name, index]));
  const isPlaced = (participant) => position.has(participant.name);
  const queue = shuffled.filter(isPlaced).sort((a, b) => position.get(a.name) - position.get(b.name));
  shuffled.forEach((participant, index) => {
    if (isPlaced(participant)) return;
    const following = shuffled.slice(index + 1).find(isPlaced);
    queue.splice(following ? queue.indexOf(following) : queue.length, 0, participant);
  });
  return queue;
}

/** 32-bit FNV-1a hash of `seed:name`. */
function rank(seed, name) {
  const text = `${seed}:${name}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}
