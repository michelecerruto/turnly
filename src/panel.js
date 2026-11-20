/**
 * The floating "3/14 · Next: name · Reset" panel. It sits just above the video grid, can be
 * dragged anywhere (double-click snaps it back), and remembers its offset across meetings.
 */
import { attachStyledShadow } from './shadow.js';

const GAP_PX = 8;
const OFFSET_KEY = 'panelOffset';
const MARKUP = `
  <div class="panel" hidden>
    <span class="progress"></span>
    <span class="next"></span>
    <button class="reset" type="button">Reset</button>
  </div>`;

let host;
let panel;
let progress;
let nextLabel;
/** Drag offset from the default position, so the panel keeps following the grid. */
let offset = { x: 0, y: 0 };

/** @param {{ onReset: () => void }} handlers */
export function mountPanel({ onReset }) {
  host = document.createElement('turnly-panel');
  // A popover lives in the top layer, above every Meet element regardless of z-index.
  host.popover = 'manual';
  host.style.cssText = 'border: 0; padding: 0; background: none; overflow: visible;';
  const root = attachStyledShadow(host, MARKUP);

  panel = root.querySelector('.panel');
  progress = panel.querySelector('.progress');
  nextLabel = panel.querySelector('.next');
  panel.querySelector('.reset').addEventListener('click', onReset);
  enableDragging();
  loadOffset();
}

/**
 * @param {object} state
 * @param {import('./participants.js').Participant[]} state.tiles visible tiles, used for placement
 * @param {number} state.total participants in the meeting
 * @param {number} state.doneCount participants marked done
 * @param {import('./participants.js').Participant} [state.next]
 */
export function renderPanel({ tiles, total, doneCount, next }) {
  panel.hidden = tiles.length === 0;
  if (tiles.length === 0) return;

  setText(progress, `${doneCount}/${total}`);
  setText(nextLabel, next ? `Next: ${next.name}` : 'Everyone is done');

  const gridTop = Math.min(...tiles.map((tile) => tile.rect.top));
  const gridLeft = Math.min(...tiles.map((tile) => tile.rect.left));
  const gridRight = Math.max(...tiles.map((tile) => tile.rect.right));
  panel.style.maxWidth = `${gridRight - gridLeft}px`;

  const { offsetWidth: width, offsetHeight: height } = panel;
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

function enableDragging() {
  let drag = null;

  panel.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    drag = { startX: event.clientX, startY: event.clientY, startOffset: offset };
    panel.setPointerCapture(event.pointerId);
    panel.classList.add('is-dragging');
  });

  panel.addEventListener('pointermove', (event) => {
    if (!drag) return;
    offset = {
      x: drag.startOffset.x + event.clientX - drag.startX,
      y: drag.startOffset.y + event.clientY - drag.startY,
    };
  });

  const endDrag = () => {
    if (!drag) return;
    drag = null;
    panel.classList.remove('is-dragging');
    saveOffset();
  };
  panel.addEventListener('pointerup', endDrag);
  panel.addEventListener('pointercancel', endDrag);

  panel.addEventListener('dblclick', (event) => {
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
