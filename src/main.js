import * as marks from './marks.js';
import { byStandupOrder } from './order.js';
import { renderOverlays } from './overlays.js';
import { mountPanel, renderPanel } from './panel.js';
import { scanParticipants, uniqueById } from './participants.js';
import { loadStyles } from './shadow.js';

await loadStyles();
marks.pruneOtherDays();
mountPanel({ onReset: marks.reset });
requestAnimationFrame(tick);

/**
 * Re-reads Meet's DOM every frame, so the UI follows resizes, layout changes, fullscreen,
 * joins and leaves without depending on Meet's internal events.
 */
function tick() {
  marks.syncMeeting(location.pathname);

  const { tiles, rows, presentIds } = scanParticipants();
  const everyone = [...tiles, ...rows];
  marks.adoptRejoined(everyone, presentIds);

  const participants = uniqueById(everyone);
  const next = participants
    .filter((participant) => !marks.isDone(participant.id))
    .sort(byStandupOrder(marks.seed()))[0];
  const doneCount = participants.filter((participant) => marks.isDone(participant.id)).length;

  renderOverlays(everyone, { isDone: marks.isDone, nextId: next?.id, onToggle: marks.toggle });
  renderPanel({ tiles, total: participants.length, doneCount, next });
  requestAnimationFrame(tick);
}
