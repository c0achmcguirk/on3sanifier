# Work Plan

This document tracks the development tasks for the project.

## To Do
- Options Page:
  - Replace the "Enable debugging" checkbox with a Material Design toggle switch.
  - Improve the "Favorite page" setting with a chip or a label and an edit icon.
- Make the "Super Ignore" button look more natural in the user hover card.
- Gate ignored users behind an additional check. Idiot Box
  - Show an error snackbar if the input is incorrect.
- Bug: Users that I've show with the idiot box are visible again after I click "Sanify" button. I want the Sanify button to "reset" the state of the page so to speak. The input of the idiot box goes back to empty, super-ignored users are hidden again, only show posts on the thread that have the required number of reactions for the threshold, make sure users that are in the "Always show" list are visible also.
- I'm seeing ignored uesrs (aka "Super ignored users") names in the reaction lists below each posts. If I'm ignoring user "Foo", I don't want to see their name in the reactions bar. Just replace their username with an empty string.
- If I open up the reactions received, I don't want to see their name in the reactions received dialog. Replace their name with "".
    - The DOM of the reactions popup looks like this below. The user listed is "SantaBarbaraSker." Change the displayed name with "" if the DOM has this show up. You may have to use a Mutation observer to detect it.
    ```
<div class="overlay" tabindex="-1" role="dialog" aria-hidden="false"><div class="overlay-title"><a class="overlay-titleCloser js-overlayClose" role="button" tabindex="0" aria-label="Close"></a>Members who reacted to message #12</div><div class="overlay-content"><div class="block">
		<div class="block-container">
			<h3 class="tabs hScroller block-minorTabHeader" data-xf-init="tabs h-scroller" data-panes="&lt; .block-container | .js-reactionTabPanes" role="tablist">
				<span class="hScroller-scroll is-calculated">
					
						<a class="tabs-tab tabs-tab--reaction0 is-active" role="tab" id="" aria-selected="true">
							
								<bdi>All</bdi> (1)
							
						</a>
					
						<a class="tabs-tab tabs-tab--reaction1" role="tab" id="reaction-1" aria-selected="false">
							
								<span class="reaction reaction--small reaction--1" data-reaction-id="1"><i aria-hidden="true"></i><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="reaction-sprite js-reaction" alt="Like" title="Like"> <span class="reaction-text js-reactionText"><bdi>Like</bdi> (1)</span></span>
							
						</a>
					
				</span><i class="hScroller-action hScroller-action--end" aria-hidden="true"></i><i class="hScroller-action hScroller-action--start" aria-hidden="true"></i>
			</h3>
			<ul class="tabPanes js-reactionTabPanes">
				
					
						<li class="is-active" role="tabpanel" id="reaction-0" aria-expanded="true">
							
	<ol class="block-body js-reactionList-0">
		
			<li class="block-row block-row--separated">
				
				
	<div class="contentRow">
		<div class="contentRow-figure">
			<a href="/boards/members/santabarbarasker.1648477/" class="avatar avatar--s" data-user-id="1648477">
			<img src="https://on3static.com/xf/data/avatars/s/1648/1648477.jpg?1751648252" srcset="https://on3static.com/xf/data/avatars/m/1648/1648477.jpg?1751648252 2x" alt="SantaBarbaraSker." class="avatar-u1648477-s" width="48" height="48" loading="lazy"> 
		</a>
		</div>
		<div class="contentRow-main">
			
				<div class="contentRow-extra ">
					<span class="reaction reaction--right reaction--1" data-reaction-id="1"><i aria-hidden="true"></i><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="reaction-sprite js-reaction" alt="Like" title="Like"></span>
					<time class="u-dt" dir="auto" datetime="2025-08-01T00:51:01-0400" data-time="1754023861" data-date-string="Aug 1, 2025" data-time-string="12:51 AM" title="Aug 1, 2025 at 12:51 AM">Thursday at 12:51 AM</time>
				</div>
			
			<h3 class="contentRow-header"><a href="/boards/members/santabarbarasker.1648477/" class="username " dir="auto" itemprop="name" data-user-id="1648477">SantaBarbaraSker.</a></h3>

			<div class="contentRow-lesser" dir="auto"><span class="userTitle" dir="auto">Active member</span></div>

			<div class="contentRow-minor">
				<ul class="listInline listInline--bullet">
					
					<li><dl class="pairs pairs--inline">
						<dt>Messages</dt>
						<dd>120</dd>
					</dl></li>
					
					
					
					<li><dl class="pairs pairs--inline">
						<dt>Reaction score</dt>
						<dd>289</dd>
					</dl></li>
					
					
					
						<li><dl class="pairs pairs--inline">
							<dt>Points</dt>
							<dd>63</dd>
						</dl></li>
					
					
				</ul>
			</div>
		</div>
	</div>

			</li>
		
		
	</ol>

						</li>
					
				
				
					
						<li data-href="/boards/posts/163842357/reactions?reaction_id=1&amp;list_only=1" class="" role="tabpanel" id="reaction-1" aria-expanded="false"><ol class="block-body js-reactionList-1">
		
			<li class="block-row block-row--separated">
				
				
	<div class="contentRow">
		<div class="contentRow-figure">
			<a href="/boards/members/santabarbarasker.1648477/" class="avatar avatar--s" data-user-id="1648477">
			<img src="https://on3static.com/xf/data/avatars/s/1648/1648477.jpg?1751648252" srcset="https://on3static.com/xf/data/avatars/m/1648/1648477.jpg?1751648252 2x" alt="SantaBarbaraSker." class="avatar-u1648477-s" width="48" height="48" loading="lazy"> 
		</a>
		</div>
		<div class="contentRow-main">
			
				<div class="contentRow-extra ">
					<span class="reaction reaction--right reaction--1" data-reaction-id="1"><i aria-hidden="true"></i><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="reaction-sprite js-reaction" alt="Like" title="Like"></span>
					<time class="u-dt" dir="auto" datetime="2025-08-01T00:51:01-0400" data-time="1754023861" data-date-string="Aug 1, 2025" data-time-string="12:51 AM" title="Aug 1, 2025 at 12:51 AM">Thursday at 12:51 AM</time>
				</div>
			
			<h3 class="contentRow-header"><a href="/boards/members/santabarbarasker.1648477/" class="username " dir="auto" itemprop="name" data-user-id="1648477">SantaBarbaraSker.</a></h3>

			<div class="contentRow-lesser" dir="auto"><span class="userTitle" dir="auto">Active member</span></div>

			<div class="contentRow-minor">
				<ul class="listInline listInline--bullet">
					
					<li><dl class="pairs pairs--inline">
						<dt>Messages</dt>
						<dd>120</dd>
					</dl></li>
					
					
					
					<li><dl class="pairs pairs--inline">
						<dt>Reaction score</dt>
						<dd>289</dd>
					</dl></li>
					
					
					
						<li><dl class="pairs pairs--inline">
							<dt>Points</dt>
							<dd>63</dd>
						</dl></li>
					
					
				</ul>
			</div>
		</div>
	</div>

			</li>
		
		
	</ol></li>
					
				
			</ul>
		</div>
	</div></div></div>
```

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