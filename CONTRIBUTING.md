# Contributing to Turnly

Thanks for helping. This guide covers the setup, the structure, and what a good pull request looks like.

## Setup

There is no build step and there are no dependencies.

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
src/
  content.js          Classic content script; only loads main.js as an ES module
  main.js             Entry point: the per-frame loop that ties everything together
  participants.js     Reads tiles and People-panel rows from Meet's DOM
  marks.js            Done marks per meeting and day, persistence, rejoin handling
  order.js            Daily speaking order shared by every attendee
  overlays.js         Check buttons, veil, and "Up next" border inside tiles and rows
  panel.js            Floating progress panel: placement, dragging, fullscreen
  shadow.js           Loads the stylesheet once and creates styled shadow roots
  styles.css          All styles, scoped inside the shadow roots
```

## Principles

- **No dependencies, no build step.** Plain ES modules that the browser runs as-is.
- **Minimal permissions.** Only `storage`. Changes that need more permissions or any network access need a strong reason.
- **Never restyle or move Meet's own elements.** Add decorations inside Shadow DOM, and stop event propagation where Meet would react to our clicks.
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

Meet can't be driven by automated tests reliably, so please run through this before opening a pull request:

- [ ] Marking and unmarking from a tile, and from the People panel (Contributors and Raised hands)
- [ ] "Up next" border, label, and panel text follow the daily order
- [ ] Resize the window, open and close side panels, switch layouts
- [ ] Fullscreen: panel visible, Reset and dragging work
- [ ] Drag the panel, double-click to snap back, reload and check the position is kept
- [ ] A participant leaves and rejoins: their mark is kept
- [ ] Two participants with the same name are marked independently
- [ ] Camera on: no large check over the face
- [ ] Meet menus and popups (Gemini, "More options") appear above the overlays
- [ ] No errors from the extension in the DevTools console

## Pull requests

- Keep each pull request focused on one change.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, for example `fix: keep panel clickable in fullscreen`.
- Describe what you changed, why, and how you tested it. Screenshots help for anything visual.
- Bump `version` in `manifest.json` only when preparing a release.

## Reporting bugs

Open an issue with your browser and its version, what you did, what you expected, what happened, a screenshot, and the console snippet output above.
