# Privacy policy

Turnly is a browser extension for Chrome and Firefox that helps teams take turns in Google Meet stand-ups. It keeps as little as possible: nothing it sends can be read as a name or a meeting.

## What Turnly reads

While you are in a meeting on `https://meet.google.com`, Turnly reads what Meet already shows on your screen: participants' display names and Meet's internal participant ids. It uses them only to draw the check buttons and to work out who is up next.

## What Turnly shares

In meetings where you turn Turnly on, it shares the queue with the other attendees who use Turnly, through Turnly's sync server (a Cloudflare Worker at `turnly.turnly-server.workers.dev`, run by the developer):

- **What is sent:** who is marked done today, today's manual order, and who always goes first, last, or is skipped. Each person is sent as a SHA-256 hash of the meeting code and their display name, and the meeting as a hash of its code, both computed in your browser. The server never receives a name, a meeting code, a participant id, or anything about you.
- **What the server keeps:** that hashed state, per meeting. Marks and the manual order are replaced each day; a meeting nobody has changed for 30 days is deleted. The server keeps no logs of its own and no IP addresses; Cloudflare, as the host, processes connection data under its own privacy policy.
- In meetings where Turnly is off, nothing is sent.

## What Turnly stores on your device

- **In the browser's extension storage (`chrome.storage.local`):** a copy of each meeting's hashed state, so Turnly works offline, and where you dragged the floating panel.
- **In the browser's synced extension storage (`chrome.storage.sync`):** the meeting codes where you turned Turnly on. If you have turned on sync in your browser, your browser copies this to your other devices through your Google or Mozilla account; otherwise it stays on this computer.

## What Turnly does not do

- It sends nothing except the hashed state described above, and only to Turnly's sync server.
- It does not use analytics, tracking, cookies, or advertising, and it never sells or shares data with third parties.
- It does not read audio, video, chat messages, or any page other than Google Meet.

## Permissions

- **`storage`**: to keep the offline copy, the panel position, and where Turnly is on.
- **Access to `meet.google.com`**: to show the check buttons and the panel inside Meet. Turnly runs on no other site.

## Removing your data

Uninstalling Turnly deletes everything it stored on your device. **Reset** clears today's marks for everyone in the meeting, and the queue list removes first, last and skip settings; the server deletes the rest after 30 days without changes.

## Contact

Questions or concerns: email turnly@m2clead.com, or open an issue in this project's GitHub repository.
