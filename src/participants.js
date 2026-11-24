/**
 * Reads participants from Meet's DOM. Meet tags both video tiles and People-panel rows
 * (`role="listitem"`, including the "Raised hands" section) with `data-participant-id`.
 *
 * @typedef {object} Participant
 * @property {'tile' | 'row'} kind
 * @property {string} id      Meet's participant id; the same on a person's tile and rows.
 * @property {string} name    Display name.
 * @property {Element} mount  Element the overlay is drawn into.
 * @property {DOMRect} [rect] Tile bounds, for tiles only.
 * @property {boolean} [hasVideo] Whether the tile shows a live camera, for tiles only.
 */

const PARTICIPANT_SELECTOR = '[data-participant-id]';
const MIN_TILE_WIDTH = 120;
const MIN_TILE_HEIGHT = 80;
const MAX_NAME_LENGTH = 80;
const ICON_FONT = /material|icons|symbols/i;
const VISIBLE = { opacityProperty: true, visibilityProperty: true };

/** @type {WeakMap<Element, { id: string, node: Text }>} */
const nameNodes = new WeakMap();

/** @returns {{ tiles: Participant[], rows: Participant[] }} */
export function scanParticipants() {
  const tiles = [];
  const rows = [];
  for (const el of document.querySelectorAll(PARTICIPANT_SELECTOR)) {
    const id = el.getAttribute('data-participant-id');
    if (el.getAttribute('role') === 'listitem') {
      const row = toRow(el, id);
      if (row) rows.push(row);
    } else {
      const tile = toTile(el, id);
      if (tile) tiles.push(tile);
    }
  }
  return { tiles, rows };
}

/** Keeps the first participant per `key`; tiles come before list rows, so tiles win. */
export function uniqueBy(participants, key) {
  const seen = new Map();
  for (const participant of participants) {
    if (!seen.has(participant[key])) seen.set(participant[key], participant);
  }
  return [...seen.values()];
}

function toTile(el, id) {
  if (el.parentElement?.closest(PARTICIPANT_SELECTOR)) return null;
  if (!el.checkVisibility(VISIBLE)) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < MIN_TILE_WIDTH || rect.height < MIN_TILE_HEIGHT) return null;
  const name = participantName(el, id);
  return name ? { kind: 'tile', id, name, mount: el, rect, hasVideo: hasLiveVideo(el) } : null;
}

/** Meet keeps a `<video>` in every tile; with the camera off it is hidden or has no frames. */
function hasLiveVideo(tile) {
  return [...tile.querySelectorAll('video')].some(
    (video) => video.videoWidth > 0 && video.checkVisibility(VISIBLE),
  );
}

/** The row's avatar container is `position: relative` and 32px, a stable spot for the toggle. */
function toRow(el, id) {
  const avatar = el.querySelector('img')?.parentElement;
  const name = participantName(el, id);
  return avatar && name ? { kind: 'row', id, name, mount: avatar } : null;
}

/**
 * Caches the name's text node rather than its text: Meet reuses a tile for another person by
 * changing its id before its label, so a cached string would stick to the wrong person.
 */
function participantName(el, id) {
  const cached = nameNodes.get(el);
  if (cached?.id === id && el.contains(cached.node)) return cached.node.textContent.trim();
  const node = findNameNode(el);
  if (!node) return '';
  nameNodes.set(el, { id, node });
  return node.textContent.trim();
}

/**
 * Meet marks display names `notranslate`; falls back to the first visible label text.
 * Icon ligatures (e.g. "mic_off") are skipped by their icon font.
 */
function findNameNode(el) {
  for (const scope of [...el.querySelectorAll('.notranslate'), el]) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const length = node.textContent.trim().length;
      if (length < 2 || length > MAX_NAME_LENGTH) continue;
      if (isLabel(node.parentElement, el)) return node;
    }
  }
  return null;
}

function isLabel(el, container) {
  const ariaHidden = el.closest('[aria-hidden="true"]');
  if (ariaHidden && container.contains(ariaHidden)) return false;
  if (ICON_FONT.test(getComputedStyle(el).fontFamily)) return false;
  return el.checkVisibility(VISIBLE);
}
