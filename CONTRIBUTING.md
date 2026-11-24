# Contributing to Turnly

Thanks for helping. This guide covers the setup, the structure, and what a good pull request looks like.

## Setup

The extension has no build step and no dependencies. Its tests run on Node 20 or newer with `node --test`. The sync server in `server/` uses Wrangler, Cloudflare's CLI, and needs Node 22.

1. Clone the repository.
2. Load the extension:
   - **Chrome:** open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the repository folder.
   - **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, and select `manifest.json`. Alternatively, `npx web-ext run` opens a clean Firefox profile with the add-on loaded and reloads it on every change.
3. After every change, reload the extension (the reload icon on the Chrome card, or **Reload** in `about:debugging`) **and** reload the Meet tab. Content scripts are not replaced in tabs that are already open.

To test with several participants, join the same meeting from a second browser profile or an incognito window.

## Project structure

```
manifest.json         Extension manifest (MV3)
icons/                Logo source (logo.svg) and the PNG sizes the browsers need
popup/                Toolbar popup: turns Turnly on or off for the current meeting
src/
  content.js          Classic content script; only loads main.js as an ES module
  main.js             Entry point: the per-frame loop, keyboard shortcut, and popup messages
  participants.js     Reads tiles and People-panel rows from Meet's DOM
  meeting.js          The current meeting's state: offline copy, sync, names to hashed tokens
  room-state.js       Room state and the changes attendees make; shared with the server
  sync.js             WebSocket connection to the meeting's room, with offline queue
  order.js            Speaking order: daily shuffle, first/last/skip rules, manual order
  overlays.js         Check buttons, veil, and "Up next" border inside tiles and rows
  panel.js            Floating bar and queue list: placement, dragging, fullscreen
  shadow.js           Loads the stylesheet once and creates styled shadow roots
  styles.css          All styles, scoped inside the shadow roots
server/
  src/index.js        Cloudflare Worker and the Room Durable Object
  wrangler.toml       Worker configuration
test/                 Unit tests for order.js and room-state.js (`node --test`)
```

## Principles

- **No dependencies, no build step.** Plain ES modules that the browser runs as-is.
- **Minimal permissions and data.** Only `storage`. Nothing readable leaves the browser: names and meeting codes are hashed before they reach the sync server. Changes that need more permissions or send more data need a strong reason.
- **One source of truth for the room.** Every change to shared state goes through `applyChange` in `room-state.js`, which both the extension and the server run.
- **Never restyle or move Meet's own elements.** Add decorations inside Shadow DOM, and stop event propagation where Meet would react to our clicks.
- **Never put participant names into `innerHTML`.** Display names are chosen by other people; set them with `textContent`.
- **Small, clear code over clever code.** Keep each module to one responsibility, name things for what they do, and comment only the non-obvious *why*.

## Meet DOM contract

Meet has no public API, so Turnly relies on a few observed facts. If Meet breaks one of them, this is where to look:

| Assumption | Used in |
| --- | --- |
| Video tiles and People-panel rows carry `data-participant-id`, with the same id for the same person | `participants.js` |
| People-panel rows (including "Raised hands") have `role="listitem"` | `participants.js` |
| A row's avatar is the parent of its first `<img>` and is `position: relative` | `participants.js` |
| Display names are the first visible, non-icon text; Meet marks them `notranslate` | `participants.js` |
| A tile shows a live `<video>` only while the camera is on | `participants.js` |
| In fullscreen, `<body>` is the fullscreen element | `panel.js` |

When you report a breakage, the output of this snippet in the DevTools console (run inside a meeting, with the People panel open) is the most useful thing to include:

```js
[...document.querySelectorAll('[data-participant-id]')].map((el) => ({
  id: el.getAttribute('data-participant-id'),
  role: el.getAttribute('role'),
  height: Math.round(el.getBoundingClientRect().height),
  text: el.innerText.replace(/\s+/g, ' ').slice(0, 40),
}));
```

## Manual test checklist

Meet can't be driven by automated tests reliably, so run `node --test`, then run through this before opening a pull request:

- [ ] Turnly stays hidden in a new meeting until turned on from the toolbar popup, and stays on after a reload
- [ ] Two attendees with Turnly on: a mark, Done, move, first/last/skip and Reset on one screen appear on the other within a second, and the panel dot is green
- [ ] Offline (disconnect the network): marks still work, the dot turns grey, and they reach the others after reconnecting
- [ ] Fresh server (`wrangler dev` with a new `--persist-to` folder): attendees keep their marks and rules, and the room is seeded from them
- [ ] Marking and unmarking from a tile, and from the People panel (Contributors and Raised hands)
- [ ] "Up next" border, label, and panel text follow the daily order
- [ ] **Done** and <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd> mark the next speaker; the shortcut does nothing while typing in the chat
- [ ] Queue list: move up/down, Always first/last, Skip and Unskip
- [ ] Reset, then Undo within five seconds
- [ ] Resize the window, open and close side panels, switch layouts
- [ ] Fullscreen: panel visible, Reset and dragging work
- [ ] Drag the panel, double-click to snap back, reload and check the position is kept
- [ ] A participant leaves and rejoins: their mark is kept
- [ ] Camera on: the tile is not dimmed when marked done
- [ ] Meet menus and popups (Gemini, "More options") appear above the overlays
- [ ] No errors from the extension in the DevTools console, apart from WebSocket connection errors while offline

## Sync server

The server is a Cloudflare Worker in `server/`. Each meeting is a room (a Durable Object) that applies changes with `room-state.js` and sends the new state to everyone connected.

```sh
cd server
nvm use             # Node 22
npm install
npm run dev         # local server on http://localhost:8787
```

To try the extension against the local server, point `SERVER_URL` in `src/sync.js` to `ws://localhost:8787` and reload the extension.

To deploy, log in once with `npx wrangler login`, then run `npm run deploy`. Wrangler prints the Worker's address (`https://turnly.<your-subdomain>.workers.dev`); `SERVER_URL` must be the same address with `wss://`.

## Pull requests

- Keep each pull request focused on one change.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, for example `fix: keep panel clickable in fullscreen`.
- Describe what you changed, why, and how you tested it. Screenshots help for anything visual.
- Bump `version` in `manifest.json` only when preparing a release.

## Reporting bugs

Open an issue with your browser and its version, what you did, what you expected, what happened, a screenshot, and the console snippet output above.
