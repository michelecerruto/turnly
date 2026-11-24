import * as meeting from './meeting.js';
import { moveName, speakingOrder } from './order.js';
import { clearOverlays, renderOverlays } from './overlays.js';
import { hidePanel, mountPanel, renderPanel, showNotice } from './panel.js';
import { scanParticipants, uniqueBy } from './participants.js';
import { loadStyles } from './shadow.js';

/** The latest queue, read by the click and keyboard handlers. */
let queue = [];
let next;

await loadStyles();
mountPanel({
  onDone: markNextDone,
  onReset: meeting.reset,
  onUndoReset: meeting.undoReset,
  onToggle: meeting.toggle,
  onMove: (index, delta) => meeting.setManualOrder(moveName(names(queue), index, delta)),
  onToggleFirst: meeting.toggleFirst,
  onToggleLast: meeting.toggleLast,
  onToggleSkip: meeting.toggleSkip,
});
chrome.runtime.onMessage.addListener(answerPopup);
addEventListener('keydown', handleShortcut, true);
requestAnimationFrame(tick);

/**
 * Re-reads Meet's DOM every frame, so the UI follows resizes, layout changes, fullscreen,
 * joins and leaves without depending on Meet's internal events.
 */
function tick() {
  // After the extension is updated or removed, this script keeps running but can't save.
  if (!chrome.runtime?.id) {
    clearOverlays();
    if (meeting.isEnabled()) showNotice('Turnly was updated. Reload the page to continue.');
    return;
  }
  requestAnimationFrame(tick);

  meeting.syncMeeting(location.pathname);
  if (!meeting.isEnabled()) {
    clearOverlays();
    hidePanel();
    return;
  }

  const { tiles, rows } = scanParticipants();
  const everyone = [...tiles, ...rows];
  // Turnly tells people apart by display name, so people sharing one are a single queue entry.
  const participants = uniqueBy(uniqueBy(everyone, 'id'), 'name');
  if (!meeting.prepare(names(participants))) return;

  const order = speakingOrder(participants, { seed: meeting.seed(), ...meeting.orderRules() });
  queue = order.queue;
  next = queue.find((participant) => !meeting.isDone(participant.name));
  const skippedIds = new Set(order.skipped.map((participant) => participant.id));

  renderOverlays(
    everyone.filter((participant) => !skippedIds.has(participant.id)),
    { isDone: meeting.isDone, nextName: next?.name, onToggle: meeting.toggle },
  );
  renderPanel({
    tiles,
    queue,
    skipped: order.skipped,
    next,
    isDone: meeting.isDone,
    rules: meeting.orderRules(),
    synced: meeting.isSynced(),
  });
}

function markNextDone() {
  if (next) meeting.toggle(next.name);
}

/** Alt+Shift+N marks the next speaker as done, unless the user is typing. */
function handleShortcut(event) {
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
  if (event.code !== 'KeyN' || !meeting.isEnabled()) return;
  const target = event.composedPath()[0];
  if (target.isContentEditable || target.closest?.('input, textarea, select')) return;
  event.preventDefault();
  markNextDone();
}

/** The toolbar popup asks for the meeting's state, and may switch Turnly on or off. */
function answerPopup(message, _sender, sendResponse) {
  if (message.type !== 'turnly:meeting') return;
  if (typeof message.enabled === 'boolean') meeting.setEnabled(message.enabled);
  sendResponse({ code: meeting.meetingCode(), enabled: meeting.isEnabled(), synced: meeting.isSynced() });
}

function names(participants) {
  return participants.map((participant) => participant.name);
}
