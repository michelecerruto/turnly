# Firefox Add-ons submission

Copy for the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/). Fields follow the order of the submission flow. The same package works for Chrome and Firefox; `browser_specific_settings.gecko` in `manifest.json` is ignored by Chrome.

## Package

Check the package against Mozilla's validator, then build the upload from the repository root:

```sh
npx web-ext lint --source-dir . --ignore-files 'docs/**'
zip -r "turnly-$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json).zip" manifest.json icons src LICENSE README.md PRIVACY.md -x '*.DS_Store'
```

Expected lint result: 0 errors and two warnings, both fine:

- `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION`: Turnly does not target Firefox for Android.
- `UNSAFE_VAR_ASSIGNMENT` in `src/shadow.js`: explained in the reviewer notes below.

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
> - Tick off speakers with the check button on each tile, or on their avatar in the People panel.
> - See who is up next: an amber border marks the next speaker, and a small panel shows progress and their name.
> - Fair daily order: the order changes every day and is the same for everyone on the team who has Turnly.
> - Works through resizes, fullscreen, layout changes, people leaving and rejoining.
> - Faces stay visible: with the camera on, the check stays in the corner.
>
> Works best when everyone in the stand-up installs it: each person sees the same order and ticks speakers off on their own screen. Also available for Chrome.
>
> Private by design: Turnly runs only on meet.google.com, makes no network requests, and keeps its data on your device.
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

> Turnly runs only on https://meet.google.com/* and requests only the storage permission, used to keep done marks and the panel position on the user's device. It makes no network requests.
>
> src/content.js dynamically imports src/main.js because content scripts cannot be declared as ES modules; every imported file ships in the package.
>
> The innerHTML assignment in src/shadow.js only receives static markup constants defined in src/overlays.js and src/panel.js, plus the add-on's own src/styles.css. No page content or participant names are passed to it.
>
> To test: join any Google Meet call (a second browser profile can join as another participant) and use the check button on a video tile.
