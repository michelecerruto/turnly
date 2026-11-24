# Chrome Web Store submission

Copy for the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Fields follow the order of the submission form.

## Package

Build the upload from the repository root:

```sh
zip -r "turnly-$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json).zip" manifest.json icons popup src LICENSE README.md PRIVACY.md -x '*.DS_Store'
```

## Store listing

**Name:** Turnly

**Summary** (from `manifest.json`, max 132 characters):

> Take turns in Google Meet stand-ups: tick off who already spoke and see who is up next.

**Description:**

> Every daily stand-up has the same pause: someone finishes, and nobody remembers who already went. Turnly keeps track for you, right on the video tiles in Google Meet.
>
> • Shared live: everyone in the meeting who has Turnly sees the same queue. Whoever finishes clicks Done, and every screen shows who is up next.
> • Tick off speakers with the check button on each tile, or on their avatar in the People panel.
> • Queue list: move people up or down for today, and choose who always goes first, last, or is skipped.
> • Fair daily order: everyone else follows a shuffle that changes every day.
> • Only where you want it: turn Turnly on per meeting from the toolbar button; a recurring stand-up keeps the setting.
> • Faces stay clear: tiles with the camera on are never dimmed.
>
> Works best when everyone in the stand-up installs it and turns it on for the meeting.
>
> Private by design: Turnly runs only on meet.google.com, and names and meeting codes are hashed in your browser before anything is shared, so the sync server never sees them.
>
> Turnly is open source: https://github.com/michelecerruto/turnly
>
> Google Meet is a trademark of Google LLC. Turnly is not affiliated with Google.

**Category:** Productivity → Workflow & Planning

**Language:** English

**Graphics:**

- Icon: `icons/icon-128.png`
- Screenshots: 1280×800 or 640×400, from `docs/` (at least one)

## Privacy practices

**Single purpose:**

> Help teams take turns in Google Meet stand-ups by marking who has spoken and showing who is up next.

**Permission justifications:**

- `storage`: Keeps an offline copy of each meeting's hashed queue state, the meetings where the user turned Turnly on, and the position of the floating panel.
- Host access (`https://meet.google.com/*`): Draws the check buttons and progress panel inside Google Meet. The extension runs on no other site.

**Remote code:** No. All code ships in the package. The extension opens a WebSocket to its own sync server and exchanges JSON data only.

**Data usage:** In meetings where the user turns Turnly on, it sends the queue state (who is marked done today, today's order, who goes first, last or is skipped) to Turnly's sync server, so every attendee sees the same queue. Each participant is sent as a SHA-256 hash of the meeting code and display name, and the meeting as a hash of its code; no names, meeting codes or user identifiers leave the device. Tick **Website content** (derived from participant names shown in Meet) and **User activity** (marking who has spoken). Data is used only to provide the shared queue, never sold or used for anything else; tick all three certifications.

**Privacy policy URL:** https://michelecerruto.github.io/turnly/PRIVACY.html (GitHub Pages; github.com file pages fail the store's link check)

**Homepage URL:** https://michelecerruto.github.io/turnly/

## Account

**Contact email** (Developer Dashboard → Account, must be verified): turnly@m2clead.com
