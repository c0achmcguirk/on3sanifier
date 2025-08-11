# Work Plan

This document tracks the development tasks for the project.

## To Do
- Options Page:
  - Replace the "Enable debugging" checkbox with a Material Design toggle switch.
  - Improve the "Favorite page" setting with a chip or a label and an edit icon.
- Make the "Super Ignore" button look more natural in the user hover card.
- Don't show Super Ignored users in reaction lists or in the dialog that shows reactions received.
- Hide super ignored usernames that are quoted in a post. Replace their username with a clown emoji.
- Gate ignored users behind an additional check. Idiot Box
  - Show an error snackbar if the input is incorrect.
- Bug: Users that I've show with the idiot box are visible again after I click "Sanify" button. I want the Sanify button to "reset" the state of the page so to speak. The input of the idiot box goes back to empty, super-ignored users are hidden again, only show posts on the thread that have the required number of reactions for the threshold, make sure users that are in the "Always show" list are visible also.

## Completed
- [x] DB Migration: Update local preferences so that ignoredUsers or blockedUsers preferences are migrated to the new superIgnoredUsers preference. Update the DB Version we are now using to version 3.
- [x] Fix bug where clicking on the super ignore button is being saved in the preferences as an object (I think). The options page shows a chip that says "[object Object]"
- [ ] Idiot box
  - When "show hidden" is active, continue to hide posts from ignored users.
  - Add a "Show posts from ignored users" button to the toolbar.
  - Clicking the button reveals a text input.
  - The user must type "i am an idiot" to reveal the posts.
- [x] Implement "Super Ignore" feature.
  - [x] Add a "Super Ignore" button with the extension logo to user hovercards.
  - [x] Update the options page to explain what "Super Ignore" is and how it differs from the forum's built-in ignore.
  - [x] When a user is "Super Ignored":
    - [x] Replace their avatar with a clown emoji.
    - [x] Change their username to "Clown: <original name>".
    - [x] Prepend their posts with: "You should probably ignore this, because I am a clown. ".
    - [x] Append their posts with: "Finally, ignore most of what I wrote above, because I am an absolute clown.".
    - [x] Hide their name from reaction/like counts.
    - [x] Change their name in quotes to "A clown said:".
- [x] Add snackbar notifications for showing/hiding content.
  - "Displaying XX hidden posts"
  - "Hiding YY posts"
  - "Displaying XX hidden threads"
  - "Hiding YY threads"
- [x] Disable "Show hidden" button when nothing is hidden.
  - Tooltip should say "No posts are hidden" on post pages.
  - Tooltip should say "No threads are hidden" on thread list pages.
- [x] Add a keyboard shortcut (Alt+Up arrow) to show/hide hidden posts.
- [x] Add links for Firefox (https://addons.mozilla.org/en-US/firefox/addon/on3-sanifier/) and Chrome Web Store (https://chromewebstore.google.com/detail/on3-sanifier/nchaljlnpleoklkakenpbeinpdhkocpj) to the popup.html file. It should list one below the other. Remove any "link coming later" messaging.
- [x] Add separation between the "Show hidden" and "Open all unread in new tabs" buttons.
- [x] Create a `WORKPLAN.md` file.