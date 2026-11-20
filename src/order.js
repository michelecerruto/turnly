/**
 * Comparator for the speaking order. Ranking each person by a hash of `seed` + name gives a
 * daily shuffle that is identical on every attendee's machine and that joins or leaves never
 * reorder. The participant id breaks ties between identical names.
 *
 * @param {string} seed changes per meeting and per day
 */
export function byStandupOrder(seed) {
  return (a, b) => rank(seed, a.name) - rank(seed, b.name) || a.id.localeCompare(b.id);
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
