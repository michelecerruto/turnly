/** Asks the Meet tab's content script for its meeting, and switches Turnly on or off for it. */

const REFRESH_MS = 1000;
const STATUS = {
  off: 'Off in this meeting. Nothing is shared.',
  connecting: 'Connecting… Your marks are saved and shared once connected.',
  live: 'Live: shared with everyone here who has Turnly on.',
};

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const card = document.querySelector('.meeting');
const toggle = document.querySelector('.switch');
const status = document.querySelector('.status');
const statusText = document.querySelector('.status-text');

const meeting = await askTab({});
if (meeting?.code) {
  card.hidden = false;
  document.querySelector('.code').textContent = meeting.code;
  render(meeting);
  toggle.addEventListener('change', async () => render(await askTab({ enabled: toggle.checked })));
  // The connection opens a moment after Turnly is turned on.
  setInterval(async () => render(await askTab({})), REFRESH_MS);
} else {
  document.querySelector('.outside').hidden = false;
}

function render(answer) {
  if (!answer) return;
  toggle.checked = answer.enabled;
  const key = !answer.enabled ? 'off' : answer.synced ? 'live' : 'connecting';
  status.classList.toggle('is-live', key === 'live');
  statusText.textContent = STATUS[key];
}

/** Resolves to null when the tab has no Turnly content script, i.e. it isn't Google Meet. */
async function askTab(fields) {
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'turnly:meeting', ...fields });
  } catch {
    return null;
  }
}
