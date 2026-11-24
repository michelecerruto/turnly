/**
 * The floating "3/14 · Next: name · Done · Reset" bar, with the queue list that opens from the
 * progress count. It sits just above the video grid, can be dragged anywhere (double-click snaps
 * it back), and remembers its offset across meetings.
 */
import { attachStyledShadow } from './shadow.js';

const GAP_PX = 8;
const OFFSET_KEY = 'panelOffset';
const UNDO_WINDOW_MS = 5000;
const SYNCED_TITLE = 'Shared live with everyone in this meeting who has Turnly';
const OFFLINE_TITLE = 'Not connected: changes are saved here and shared once the connection is back';
const ICONS = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4m6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/></svg>',
};
const MARKUP = `
  <div class="panel" hidden>
    <div class="bar">
      <span class="sync" role="img"></span>
      <button class="progress" type="button" aria-expanded="false" title="Show the queue"></button>
      <span class="next"></span>
      <button class="pill done" type="button">Done</button>
      <button class="pill reset" type="button">Reset</button>
    </div>
    <div class="queue" hidden>
      <ol class="queue-list"></ol>
      <p class="skipped-title" hidden>Skipped in this meeting</p>
      <ul class="skipped-list"></ul>
    </div>
  </div>`;

let host;
let panel;
let elements;
let handlers;
/** Drag offset from the default position, so the panel keeps following the grid. */
let offset = { x: 0, y: 0 };
/** Name whose "Always first / Always last / Skip" actions are open in the queue. */
let openMenu = null;
let queueSignature = '';
/** The queue entries the list currently shows, indexed like its rows. */
let shownItems = [];
let undoTimer = null;

/**
 * @param {object} callbacks
 * @param {() => void} callbacks.onDone marks the next speaker as done
 * @param {() => void} callbacks.onReset
 * @param {() => void} callbacks.onUndoReset
 * @param {(name: string) => void} callbacks.onToggle
 * @param {(index: number, delta: number) => void} callbacks.onMove moves a queue entry
 * @param {(name: string) => void} callbacks.onToggleFirst
 * @param {(name: string) => void} callbacks.onToggleLast
 * @param {(name: string) => void} callbacks.onToggleSkip
 */
export function mountPanel(callbacks) {
  handlers = callbacks;
  host = document.createElement('turnly-panel');
  // A popover lives in the top layer, above every Meet element regardless of z-index.
  host.popover = 'manual';
  host.style.cssText = 'border: 0; padding: 0; background: none; overflow: visible;';
  const root = attachStyledShadow(host, MARKUP);

  panel = root.querySelector('.panel');
  elements = {
    bar: panel.querySelector('.bar'),
    sync: panel.querySelector('.sync'),
    progress: panel.querySelector('.progress'),
    next: panel.querySelector('.next'),
    done: panel.querySelector('.done'),
    reset: panel.querySelector('.reset'),
    queue: panel.querySelector('.queue'),
    queueList: panel.querySelector('.queue-list'),
    skippedTitle: panel.querySelector('.skipped-title'),
    skippedList: panel.querySelector('.skipped-list'),
  };
  elements.progress.addEventListener('click', toggleQueue);
  elements.done.addEventListener('click', () => handlers.onDone());
  elements.reset.addEventListener('click', resetOrUndo);
  elements.queue.addEventListener('click', handleQueueClick);
  enableDragging();
  loadOffset();
}

/**
 * @param {object} state
 * @param {import('./participants.js').Participant[]} state.tiles visible tiles, used for placement
 * @param {import('./participants.js').Participant[]} state.queue everyone who takes a turn, in order
 * @param {import('./participants.js').Participant[]} state.skipped present but skipped
 * @param {import('./participants.js').Participant} [state.next]
 * @param {(name: string) => boolean} state.isDone
 * @param {{ first: string | null, last: string | null }} state.rules
 * @param {boolean} state.synced whether changes reach the other attendees right now
 */
export function renderPanel({ tiles, queue, skipped, next, isDone, rules, synced }) {
  panel.hidden = tiles.length === 0;
  if (tiles.length === 0) return;

  const doneCount = queue.filter((participant) => isDone(participant.name)).length;
  elements.sync.classList.toggle('is-synced', synced);
  setTitle(elements.sync, synced ? SYNCED_TITLE : OFFLINE_TITLE);
  setText(elements.progress, `${doneCount}/${queue.length}`);
  setText(elements.next, next ? `Next: ${next.name}` : 'Everyone is done');
  elements.done.hidden = !next;
  if (next) setTitle(elements.done, `Mark ${next.name} as done (Alt+Shift+N)`);
  if (!elements.queue.hidden) renderQueue(queue, skipped, next, isDone, rules);

  place(tiles);
}

export function hidePanel() {
  panel.hidden = true;
}

/** Replaces the bar's content with `message` where the panel already is, and closes the queue. */
export function showNotice(message) {
  for (const element of [elements.sync, elements.progress, elements.done, elements.reset, elements.queue]) {
    element.hidden = true;
  }
  setText(elements.next, message);
}

function place(tiles) {
  const gridTop = Math.min(...tiles.map((tile) => tile.rect.top));
  const gridLeft = Math.min(...tiles.map((tile) => tile.rect.left));
  const gridRight = Math.max(...tiles.map((tile) => tile.rect.right));
  elements.bar.style.maxWidth = `${gridRight - gridLeft}px`;

  // The queue hangs below the bar, so only the bar's size counts for placement.
  const { offsetWidth: width, offsetHeight: height } = elements.bar;
  const defaultTop = Math.max(GAP_PX, gridTop - height - GAP_PX);
  const defaultCenterX = (gridLeft + gridRight) / 2;
  const top = clamp(defaultTop + offset.y, 0, innerHeight - height);
  const centerX = clamp(defaultCenterX + offset.x, width / 2, innerWidth - width / 2);
  panel.style.top = `${top}px`;
  panel.style.left = `${centerX}px`;
  keepOnTop(centerX, top + height / 2);
}

/**
 * In fullscreen, content outside the fullscreen element can't be clicked, so the panel must live
 * inside it. Entering fullscreen also hides popovers; re-showing puts the panel back on top.
 */
function keepOnTop(x, y) {
  const container = document.fullscreenElement ?? document.body;
  if (host.parentElement !== container) container.append(host);
  if (document.elementFromPoint(x, y) === host) return;
  if (host.matches(':popover-open')) host.hidePopover();
  host.showPopover();
}

function toggleQueue() {
  const open = elements.queue.hidden;
  elements.queue.hidden = !open;
  elements.progress.setAttribute('aria-expanded', String(open));
  setTitle(elements.progress, open ? 'Hide the queue' : 'Show the queue');
  openMenu = null;
}

function resetOrUndo() {
  clearTimeout(undoTimer);
  if (elements.reset.classList.contains('is-undo')) {
    handlers.onUndoReset();
    showReset();
    return;
  }
  handlers.onReset();
  elements.reset.classList.add('is-undo');
  setText(elements.reset, 'Undo');
  undoTimer = setTimeout(showReset, UNDO_WINDOW_MS);
}

function showReset() {
  elements.reset.classList.remove('is-undo');
  setText(elements.reset, 'Reset');
}

/** Rebuilds the list only when what it shows changes, so hover and focus survive every frame. */
function renderQueue(queue, skipped, next, isDone, rules) {
  const items = queue.map(({ id, name }) => ({
    id,
    name,
    done: isDone(name),
    next: id === next?.id,
    pin: pinOf(name, rules),
  }));
  const skippedNames = skipped.map((participant) => participant.name);
  const signature = JSON.stringify([items, skippedNames, openMenu]);
  if (signature === queueSignature) return;
  queueSignature = signature;
  shownItems = items;

  elements.queueList.replaceChildren(
    ...items.flatMap((item, index) => {
      const row = queueRow(item, index, items);
      return item.name === openMenu ? [row, menuRow(item, index)] : [row];
    }),
  );
  elements.skippedTitle.hidden = skippedNames.length === 0;
  elements.skippedList.replaceChildren(...skippedNames.map(skippedRow));
}

function pinOf(name, rules) {
  if (name === rules.first) return 'first';
  if (name === rules.last) return 'last';
  return null;
}

/** Pinned people keep their place, so they can't move and nobody can swap into their spot. */
function queueRow({ name, done, next, pin }, index, items) {
  const isFixed = (position) => !items[position] || items[position].pin !== null;
  const row = element('li', 'item');
  row.dataset.index = String(index);
  row.classList.toggle('is-done', done);
  row.classList.toggle('is-next', next);
  row.append(
    iconButton('toggle', ICONS.check, done ? `Undo ${name}` : `Mark ${name} as done`, { pressed: done }),
    element('span', 'name', name),
  );
  if (pin) row.append(element('span', 'tag', pin === 'first' ? 'First' : 'Last'));
  row.append(
    iconButton('up', ICONS.up, `Move ${name} up`, { disabled: pin !== null || isFixed(index - 1) }),
    iconButton('down', ICONS.down, `Move ${name} down`, { disabled: pin !== null || isFixed(index + 1) }),
    iconButton('menu', ICONS.more, `More for ${name}`, { expanded: name === openMenu }),
  );
  return row;
}

function menuRow({ pin }, index) {
  const row = element('li', 'menu');
  row.dataset.index = String(index);
  row.append(
    textButton('first', 'Always first', { pressed: pin === 'first' }),
    textButton('last', 'Always last', { pressed: pin === 'last' }),
    textButton('skip', 'Skip'),
  );
  return row;
}

function skippedRow(name) {
  const row = element('li', 'item is-skipped');
  row.dataset.name = name;
  row.append(element('span', 'name', name), textButton('unskip', 'Unskip'));
  return row;
}

function handleQueueClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('li');
  if (button.dataset.action === 'unskip') {
    handlers.onToggleSkip(row.dataset.name);
    return;
  }

  const index = Number(row.dataset.index);
  const { name } = shownItems[index];
  switch (button.dataset.action) {
    case 'toggle':
      handlers.onToggle(name);
      break;
    case 'up':
      handlers.onMove(index, -1);
      break;
    case 'down':
      handlers.onMove(index, 1);
      break;
    case 'menu':
      openMenu = openMenu === name ? null : name;
      break;
    case 'first':
      handlers.onToggleFirst(name);
      openMenu = null;
      break;
    case 'last':
      handlers.onToggleLast(name);
      openMenu = null;
      break;
    case 'skip':
      handlers.onToggleSkip(name);
      openMenu = null;
      break;
  }
}

function iconButton(action, icon, label, state) {
  const button = textButton(action, '', state);
  button.className = 'icon';
  button.innerHTML = icon;
  button.title = label;
  button.setAttribute('aria-label', label);
  return button;
}

function textButton(action, text, { pressed, expanded, disabled } = {}) {
  const button = element('button', 'pill', text);
  button.type = 'button';
  button.dataset.action = action;
  if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed));
  if (expanded !== undefined) button.setAttribute('aria-expanded', String(expanded));
  button.disabled = Boolean(disabled);
  return button;
}

function element(tag, className, text = '') {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

function enableDragging() {
  let drag = null;

  elements.bar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    drag = { startX: event.clientX, startY: event.clientY, startOffset: offset };
    elements.bar.setPointerCapture(event.pointerId);
    elements.bar.classList.add('is-dragging');
  });

  elements.bar.addEventListener('pointermove', (event) => {
    if (!drag) return;
    offset = {
      x: drag.startOffset.x + event.clientX - drag.startX,
      y: drag.startOffset.y + event.clientY - drag.startY,
    };
  });

  const endDrag = () => {
    if (!drag) return;
    drag = null;
    elements.bar.classList.remove('is-dragging');
    saveOffset();
  };
  elements.bar.addEventListener('pointerup', endDrag);
  elements.bar.addEventListener('pointercancel', endDrag);

  elements.bar.addEventListener('dblclick', (event) => {
    if (event.target.closest('button')) return;
    offset = { x: 0, y: 0 };
    saveOffset();
  });
}

async function loadOffset() {
  const stored = await chrome.storage.local.get(OFFSET_KEY);
  if (stored[OFFSET_KEY]) offset = stored[OFFSET_KEY];
}

function saveOffset() {
  chrome.storage.local.set({ [OFFSET_KEY]: offset });
}

/** Rewriting identical text still invalidates layout, and this runs every frame. */
function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

function setTitle(el, title) {
  if (el.title !== title) el.title = title;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
