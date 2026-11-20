# Privacy policy

Turnly is a Chrome extension that helps teams take turns in Google Meet stand-ups. It is built to keep everything on your device.

## What Turnly reads

While you are in a meeting on `https://meet.google.com`, Turnly reads what Meet already shows on your screen: participants' display names and Meet's internal participant ids. It uses them only to draw the check buttons and to work out who is up next.

## What Turnly stores

Turnly saves two things in Chrome's extension storage (`chrome.storage.local`) on your computer:

- **Done marks:** for each meeting, the participant ids and display names you marked as done today. Marks from previous days are deleted automatically.
- **Panel position:** where you dragged the floating panel.

## What Turnly does not do

- It makes no network requests and sends no data anywhere: not to the developer, not to third parties, not to other attendees.
- It does not use analytics, tracking, cookies, or advertising.
- It does not read audio, video, chat messages, or any page other than Google Meet.

## Permissions

- **`storage`**: to remember done marks and the panel position on your device.
- **Access to `meet.google.com`**: to show the check buttons and the panel inside Meet. Turnly runs on no other site.

## Removing your data

Uninstalling Turnly deletes everything it stored. Clicking **Reset** in the panel clears the current meeting's marks at any time.

## Contact

Questions or concerns: email turnly@m2clead.com, or open an issue in this project's GitHub repository.
