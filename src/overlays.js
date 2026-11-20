/**
 * Decorations drawn inside each participant's video tile or People-panel avatar. Living inside
 * Meet's own elements keeps Meet's popups and menus stacked above them, and keeps them visible
 * in fullscreen.
 */
import { attachStyledShadow } from './shadow.js';

// Intrinsic size keeps the icon small even if the stylesheet ever fails to load.
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
const TOGGLE_BUTTON = `<button class="toggle" type="button">${CHECK_ICON}</button>`;
const MARKUP = {
  tile: `
    <div class="overlay tile">
      <div class="veil">${CHECK_ICON}</div>
      ${TOGGLE_BUTTON}
      <span class="up-next">Up next</span>
    </div>`,
  row: `<div class="overlay row">${TOGGLE_BUTTON}</div>`,
};

/** @type {Map<Element, { host: HTMLElement, el: Element, button: HTMLButtonElement, id?: string, name?: string }>} */
const overlays = new Map();

/**
 * Creates, updates and removes overlays so they match `participants` exactly.
 *
 * @param {import('./participants.js').Participant[]} participants
 * @param {object} state
 * @param {(id: string) => boolean} state.isDone
 * @param {string} [state.nextId] participant who speaks next
 * @param {(id: string, name: string) => void} state.onToggle
 */
export function renderOverlays(participants, { isDone, nextId, onToggle }) {
  const mounted = new Set();
  for (const participant of participants) {
    mounted.add(participant.mount);
    const overlay = overlays.get(participant.mount) ?? createOverlay(participant, onToggle);
    updateOverlay(overlay, participant, isDone(participant.id), participant.id === nextId);
  }
  for (const [mount, overlay] of overlays) {
    if (mounted.has(mount)) continue;
    overlay.host.remove();
    overlays.delete(mount);
  }
}

function createOverlay({ kind, mount }, onToggle) {
  const host = document.createElement('turnly-overlay');
  host.style.cssText = 'position: absolute; inset: 0; pointer-events: none;';
  const root = attachStyledShadow(host, MARKUP[kind]);

  const overlay = { host, el: root.querySelector('.overlay'), button: root.querySelector('.toggle') };
  // Meet's tiles react to pointer events (focus, pin menu); keep our clicks to ourselves.
  for (const type of ['pointerdown', 'mousedown', 'click']) {
    overlay.button.addEventListener(type, (event) => event.stopPropagation());
  }
  overlay.button.addEventListener('click', () => onToggle(overlay.id, overlay.name));
  overlays.set(mount, overlay);
  return overlay;
}

function updateOverlay(overlay, { mount, id, name, hasVideo = false }, isDone, isNext) {
  // Meet re-renders tiles and can drop foreign children; put the overlay back if so.
  if (overlay.host.parentElement !== mount) mount.append(overlay.host);
  Object.assign(overlay, { id, name });
  overlay.el.classList.toggle('is-done', isDone);
  overlay.el.classList.toggle('is-next', isNext);
  overlay.el.classList.toggle('has-video', hasVideo);
  const title = isDone ? `Undo ${name}` : `Mark ${name} as done`;
  if (overlay.button.title !== title) overlay.button.title = title;
}
