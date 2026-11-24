# Firefox Add-ons submission

Copy for the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/). Fields follow the order of the submission flow. The same package works for Chrome and Firefox; `browser_specific_settings.gecko` in `manifest.json` is ignored by Chrome.

## Package

Check the package against Mozilla's validator, then build the upload from the repository root:

```sh
npx web-ext lint --source-dir . --ignore-files 'docs/**' 'server/**' 'test/**'
zip -r "turnly-$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json).zip" manifest.json icons popup src LICENSE README.md PRIVACY.md -x '*.DS_Store'
```

Expected lint result: 0 errors, and at most these warnings, all fine:

- `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION`: Turnly does not target Firefox for Android.
- `UNSAFE_VAR_ASSIGNMENT` in `src/shadow.js` and `src/panel.js`: explained in the reviewer notes below.

## Submit

- **Distribution:** On this site (listed on addons.mozilla.org).
- **Compatibility:** Firefox only. Untick Firefox for Android.
- **Source code:** No. The package has no build step, bundler, or minified code.

## Listing

**Name:** Turnly

**Add-on URL:** `turnly`

**Summary** (from `manifest.json`, max 250 characters):

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
> Works best when everyone in the stand-up installs it and turns it on for the meeting. Also available for Chrome.
>
> Private by design: Turnly runs only on meet.google.com, and names and meeting codes are hashed in your browser before anything is shared, so the sync server never sees them.
>
> Turnly is open source: https://github.com/michelecerruto/turnly
>
> Google Meet is a trademark of Google LLC. Turnly is not affiliated with Google.

**Categories:** Social & Communication

**Support email:** turnly@m2clead.com

**Support website:** https://github.com/michelecerruto/turnly/issues

**License:** MIT License

**Privacy policy:** Yes. Paste the text of `PRIVACY.md`.

**Homepage:** https://michelecerruto.github.io/turnly/

**Graphics:**

- Icon: taken from `manifest.json`
- Screenshots: the same ones used for the Chrome Web Store listing

## Notes to reviewer

> Turnly runs only on https://meet.google.com/* and requests only the storage permission. In meetings where the user turns it on, it opens a WebSocket to its sync server (wss://turnly.turnly-server.workers.dev, a Cloudflare Worker whose source is in server/ in the repository) to share the queue with other attendees. Participants and the meeting are sent only as SHA-256 hashes computed in the browser, declared as websiteContent and websiteActivity.
>
> src/content.js dynamically imports src/main.js because content scripts cannot be declared as ES modules; every imported file ships in the package.
>
> The innerHTML assignments in src/shadow.js and src/panel.js only receive static markup and icon constants defined in src/overlays.js and src/panel.js, plus the add-on's own src/styles.css. Participant names are always set with textContent.
>
> To test: join any Google Meet call (a second browser profile can join as another participant), click the Turnly toolbar button and turn on "Show Turnly here", then use the check button on a video tile or the Done button on the panel.
