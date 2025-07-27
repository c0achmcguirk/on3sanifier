# Work Plan

This document tracks the development tasks for the project.

## To Do

- [x] Add snackbar notifications for showing/hiding content.
  - "Displaying XX hidden posts"
  - "Hiding YY posts"
  - "Displaying XX hidden threads"
  - "Hiding YY threads"
- Add links for Firefox (https://addons.mozilla.org/en-US/firefox/addon/on3-sanifier/) and Chrome Web Store (https://chromewebstore.google.com/detail/on3-sanifier/nchaljlnpleoklkakenpbeinpdhkocpj) to the popup.html file. It should list one below the other. Remove any "link coming later" messaging.
- [x] Disable "Show hidden" button when nothing is hidden.
  - Tooltip should say "No posts are hidden" on post pages.
  - Tooltip should say "No threads are hidden" on thread list pages.
- Add a keyboard shortcut (Alt+Up arrow) to show/hide hidden posts.
- Implement "Super Ignore" feature.
  - Add a "Super Ignore" button with the extension logo to user hovercards.
  - Update the options page to explain what "Super Ignore" is and how it differs from the forum's built-in ignore.
  - When a user is "Super Ignored":
    - Replace their avatar with a clown emoji.
    - Change their username to "Clown: <original name>".
    - Prepend their posts with: "You should probably ignore this, because I am a clown. ".
    - Append their posts with: "Finally, ignore most of what I wrote above, because I am an absolute clown.".
    - Hide their name from reaction/like counts.
    - Change their name in quotes to "A clown said:".
- BIG: Gate ignored users behind an additional check.
  - When "show hidden" is active, continue to hide posts from ignored users.
  - Add a "Show posts from ignored users" button to the toolbar.
  - Clicking the button reveals a text input.
  - The user must type "i am an idiot" to reveal the posts.
  - Show an error snackbar if the input is incorrect.

## Completed

- [x] Add separation between the "Show hidden" and "Open all unread in new tabs" buttons.
- [x] Create a `WORKPLAN.md` file.