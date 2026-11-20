<p align="center">
  <img src="icons/icon-128.png" width="96" height="96" alt="Turnly logo">
</p>

<h1 align="center">Turnly</h1>

<p align="center">
  Take turns in Google Meet stand-ups without the "who's next?" pause.<br>
  Tick off who already spoke and see who is up next, right on the video tiles.
</p>

---

## Why

Every daily stand-up has the same moment: someone finishes, and nobody remembers who already went. Turnly keeps track for you, directly inside Google Meet.

## Features

- **Tick off speakers** with the check button on each video tile, or on the avatar in the People panel (including the "Raised hands" section). A done tile is dimmed with a large check; with the camera on, the check stays in the corner so faces remain visible.
- **See who is up next**: an amber border and an "Up next" label mark the next speaker, and a floating panel shows progress (`5/14`) and their name.
- **Fair daily order**: the next speaker comes from a shuffle that changes every day and is identical for every attendee who has the extension, so the same person isn't always first.
- **Survives real meetings**: window resizes, fullscreen, layout changes, people leaving, and rejoining (marks follow the person). Two people with the same name are tracked separately.
- **Draggable panel**: move it out of the way; double-click to snap it back. Its position is remembered.
- **Reset** clears every mark. Marks are kept per meeting and per day, and older days are deleted automatically.

## Install

Turnly is not on the Chrome Web Store yet. To install it from source:

1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the repository folder.
4. Join a meeting on [meet.google.com](https://meet.google.com).

Requires Chrome 121 or newer (or another Chromium browser of the same version).

## Use it as a team

Turnly works best when everyone in the stand-up has it installed. Each person sees the same speaking order, because every copy computes it from the meeting and the day, and each person ticks speakers off on their own screen as they finish. Nothing is synced between attendees, so there is no account, no server, and no setup.

## Privacy

- Runs only on `https://meet.google.com/*`.
- Requests a single permission, `storage`, to remember marks and the panel position on your device.
- Makes no network requests, collects no data, and reads nothing beyond the participant names and tiles already on your screen.

Full details in the [privacy policy](PRIVACY.md).

## How it works

Meet tags each video tile and each People-panel row with the participant's id (`data-participant-id`). Every animation frame, Turnly reads those elements and draws its decorations inside them, using Shadow DOM so Meet's styles and the extension's styles never mix. Living inside Meet's own elements keeps Meet's menus above the decorations and makes them follow every layout change. The floating panel lives in the browser's top layer so it stays reachable in fullscreen.

## Limitations

- **Marks are local.** Each attendee sees their own marks; there is no shared state between browsers. The speaking order is shared because everyone computes the same order.
- **Depends on Meet's markup.** Meet has no public API for this. If Google changes the attributes Turnly relies on, it may stop working until updated. Please [open an issue](../../issues) if it does.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

Google Meet is a trademark of Google LLC. This project is not affiliated with or endorsed by Google.
