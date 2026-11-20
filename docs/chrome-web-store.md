# Chrome Web Store submission

Copy for the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Fields follow the order of the submission form.

## Package

Build the upload from the repository root:

```sh
zip -r "turnly-$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json).zip" manifest.json icons src LICENSE README.md PRIVACY.md -x '*.DS_Store'
```

## Store listing

**Name:** Turnly

**Summary** (from `manifest.json`, max 132 characters):

> Take turns in Google Meet stand-ups: tick off who already spoke and see who is up next.

**Description:**

> Every daily stand-up has the same pause: someone finishes, and nobody remembers who already went. Turnly keeps track for you, right on the video tiles in Google Meet.
>
> • Tick off speakers with the check button on each tile, or on their avatar in the People panel.
> • See who is up next: an amber border marks the next speaker, and a small panel shows progress and their name.
> • Fair daily order: the order changes every day and is the same for everyone on the team who has Turnly.
> • Works through resizes, fullscreen, layout changes, people leaving and rejoining.
> • Faces stay visible: with the camera on, the check stays in the corner.
>
> Works best when everyone in the stand-up installs it: each person sees the same order and ticks speakers off on their own screen.
>
> Private by design: Turnly runs only on meet.google.com, makes no network requests, and keeps its data on your device.
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

- `storage`: Saves which participants were marked as done in today's meeting, and the position of the floating panel, on the user's device.
- Host access (`https://meet.google.com/*`): Draws the check buttons and progress panel inside Google Meet. The extension runs on no other site.

**Remote code:** No. All code ships in the package.

**Data usage:** Turnly reads participant display names shown in Meet and stores them only on the user's device, together with the done marks. Nothing is transmitted off the device, sold, or used for any other purpose. Check the form's own definitions when answering the data category questions, then tick all three certifications.

**Privacy policy URL:** https://michelecerruto.github.io/turnly/PRIVACY.html (GitHub Pages; github.com file pages fail the store's link check)

**Homepage URL:** https://michelecerruto.github.io/turnly/

## Account

**Contact email** (Developer Dashboard → Account, must be verified): turnly@m2clead.com
