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

- **Only where you want it**: Turnly is off until you turn it on for a meeting from its toolbar button. The choice is remembered per meeting link, so a recurring stand-up only needs it once.
- **Shared live**: everyone in the meeting who has Turnly on sees the same marks, order and queue, updated within a second. Whoever finishes marks themselves done, and everyone sees who is next. A dot on the panel shows whether it is connected. Turnly never depends on the server: offline, or if the server is unreachable, it works on your device as before, and your changes are shared when the connection is back.
- **Tick off speakers** with the check button on each video tile, or on the avatar in the People panel (including the "Raised hands" section). A done tile is dimmed; with the camera on, only the corner check changes so faces stay clear.
- **See who is up next**: an amber border and an "Up next" label mark the next speaker, and a floating panel shows progress (`5/14`) and their name.
- **Done in one click**: the panel's **Done** button, or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd>, marks the next speaker as done.
- **Queue list**: click the progress count to see the whole order. Move people up or down for today, and from the **⋯** menu set who always goes **first** or **last**, or who is **skipped** in this meeting (for someone who only listens).
- **Fair daily order**: everyone else follows a shuffle that changes every day and is identical for every attendee who has the extension, so the same person isn't always first.
- **Survives real meetings**: window resizes, fullscreen, layout changes, people leaving, and rejoining (marks follow the person).
- **Draggable panel**: move it out of the way; double-click to snap it back. Its position is remembered.
- **Reset** clears every mark, with a few seconds to undo it. Marks are kept per meeting and per day, and older days are deleted automatically.

## Install

### Chrome

Install Turnly from the [Chrome Web Store](https://chromewebstore.google.com/detail/turnly/hcccakeknmcdkoieigkpjnbfbomcjdej).

To install it from source instead:

1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the repository folder.
4. Join a meeting on [meet.google.com](https://meet.google.com), click the Turnly toolbar button, and turn on **Show Turnly here**.

Requires Chrome 121 or newer (or another Chromium browser of the same version).

### Firefox

Turnly is not on Firefox Add-ons yet. To install it from source:

1. Download or clone this repository.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json` in the repository folder.
4. Open `about:addons`, select Turnly, and under **Permissions** make sure access to `meet.google.com` is on.
5. Join a meeting on [meet.google.com](https://meet.google.com), or reload the tab if you are already in one, then click the Turnly toolbar button and turn on **Show Turnly here**.

Firefox removes temporary add-ons when it quits, so repeat steps 2 and 3 after each restart. Requires Firefox 140 or newer.

## Use it as a team

Turnly works best when everyone in the stand-up has it installed and turned on for the meeting. Everyone then shares one queue: when someone finishes, they click **Done** (or mark their own tile), and every screen shows who is up next, so the team keeps the pace without a facilitator calling names. The first, last and skip settings and today's moves are shared too, so one person sets them for everyone. There is no account and no setup.

## Privacy

- Runs only on `https://meet.google.com/*`.
- Requests a single permission, `storage`, to remember marks, the panel position and your per-meeting settings. Settings go through your browser's own sync if you have it turned on.
- Shares marks and the queue through Turnly's sync server, which never sees a name or meeting code: both are hashed in your browser before anything is sent. Rooms nobody has changed for 30 days are deleted.
- Reads nothing beyond the participant names and tiles already on your screen, and uses no analytics or tracking.

Full details in the [privacy policy](PRIVACY.md).

## How it works

Meet tags each video tile and each People-panel row with the participant's id (`data-participant-id`). Every animation frame, Turnly reads those elements and draws its decorations inside them, using Shadow DOM so Meet's styles and the extension's styles never mix. Living inside Meet's own elements keeps Meet's menus above the decorations and makes them follow every layout change. The floating panel lives in the browser's top layer so it stays reachable in fullscreen.

Each meeting is a room on a small Cloudflare Worker ([`server/`](server/)). Attendees send changes such as "this person is done" over a WebSocket, and the room sends the resulting state to everyone. People are identified by a SHA-256 hash of the meeting code and their display name, the one thing every attendee sees the same.

## Limitations

- **People are matched by display name.** Two people with exactly the same name count as one: they share one mark and one place in the queue.
- **Depends on Meet's markup.** Meet has no public API for this. If Google changes the attributes Turnly relies on, it may stop working until updated. Please [open an issue](../../issues) if it does.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

Google Meet is a trademark of Google LLC. This project is not affiliated with or endorsed by Google.
