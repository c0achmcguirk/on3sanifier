console.log('on3 Sanifier content script loaded.');

import {
  colorCodePostsByReactions,
  filterPosts,
  filterThreads,
  On3Helpers,
} from './lib/helpers';
import {MDCRipple} from '@material/ripple';

function createToolbar(
  hiddenCount: number,
  mode: string | undefined,
): HTMLElement {
  const newDiv = document.createElement('div');
  newDiv.className = 'on3san-toolbar';

  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('o3s_logo_48.png');
  logo.style.height = '24px';
  logo.style.marginRight = '16px';

  // Add a tooltip to the logo.
  const manifest = chrome.runtime.getManifest();
  const isFirefox = manifest.browser_specific_settings?.gecko?.id;
  logo.title = isFirefox
    ? 'Toolbar from the on3 Sanifier add-on'
    : 'Toolbar from the on3 Sanifier extension';

  newDiv.appendChild(logo);

  const showHiddenButton = document.createElement('button');
  showHiddenButton.className = 'mdc-button mdc-button--raised show-hidden-button';
  showHiddenButton.innerHTML =
    '<span class="mdc-button__label">Show hidden</span>';
  new MDCRipple(showHiddenButton);

  // Set initial state and tooltip for the showHiddenButton.
  updateShowHiddenButtonState(showHiddenButton, hiddenCount, mode);

  showHiddenButton.addEventListener('click', async () => {
    console.log('!!! on3san shbclick: button clicked');
    document.body.classList.toggle('on3san-show-all');
    const isShowingAll = document.body.classList.contains('on3san-show-all');
    console.log('!!! on3san shbclick: isShowingAll is now', isShowingAll);
    const newText = isShowingAll ? 'Sanify' : 'Show hidden';
    console.log('!!! on3san shbclick: new button text will be', newText);
    showHiddenButton.querySelector('.mdc-button__label')!.textContent = newText;

    // Re-run the sanifier to update counts and show snackbar.
    console.log('!!! on3san shbclick: about to run sanifier');
    await runSanifier(true); // Pass true to show snackbar
    console.log('!!! on3san shbclick: sanifier finished');
    console.log('!!! on3san shbclick: about to update idiot box visibility');
    updateIdiotBoxVisibility();
    console.log('!!! on3san shbclick: idiot box visibility updated');
  });

  newDiv.appendChild(showHiddenButton);

  const helpers = new On3Helpers();

  if (mode === 'inforum' || mode === 'inlist') {
    const openUnreadButton = document.createElement('button');
    openUnreadButton.className = 'mdc-button mdc-button--raised';
    openUnreadButton.innerHTML =
      '<span class="mdc-button__label">Open all unread in new tabs</span>';
    new MDCRipple(openUnreadButton);

    openUnreadButton.addEventListener('click', () => {
      void helpers.openUnreadThreadsInTabs();
    });

    newDiv.appendChild(openUnreadButton);
  } else if (mode === 'inthread') {
    const ignoreThreadButton = document.createElement('button');
    ignoreThreadButton.className =
      'mdc-button mdc-button--raised ignore-thread-button';
    ignoreThreadButton.innerHTML =
      '<span class="mdc-button__label">Ignore thread</span>';
    new MDCRipple(ignoreThreadButton);

    const threadId = helpers.getThreadIdFromUrl(window.location.href);
    const threadTitle = helpers.getThreadTitleFromUrl(window.location.href);

    const setButtonState = async (isIgnored: boolean) => {
      document
        .querySelectorAll<HTMLButtonElement>('.ignore-thread-button')
        .forEach(button => {
          if (isIgnored) {
            button.innerHTML =
              '<span class="mdc-button__label">Stop ignoring thread</span>';
            button.classList.add('mdc-button--unelevated');
            button.classList.remove('mdc-button--raised');
          } else {
            button.innerHTML =
              '<span class="mdc-button__label">Ignore thread</span>';
            button.classList.add('mdc-button--raised');
            button.classList.remove('mdc-button--unelevated');
          }
        });
    };

    if (threadId) {
      void helpers.getPreference({ignoredThreads: []}).then(result => {
        const ignoredThreads = (result.ignoredThreads || []) as {
          id: string;
          title: string;
        }[];
        setButtonState(ignoredThreads.some(t => t.id === threadId));
      });
    }

    ignoreThreadButton.addEventListener('click', async () => {
      if (threadId && threadTitle) {
        const result = await helpers.getPreference({ignoredThreads: []});
        const ignoredThreads = (result.ignoredThreads || []) as {
          id: string;
          title: string;
        }[];
        const isIgnored = ignoredThreads.some(t => t.id === threadId);

        if (isIgnored) {
          const newIgnoredThreads = ignoredThreads.filter(
            t => t.id !== threadId,
          );
          await helpers.setPreference({ignoredThreads: newIgnoredThreads});
          setButtonState(false);
        } else {
          const newIgnoredThreads = [
            ...ignoredThreads,
            {id: threadId, title: threadTitle},
          ];
          await helpers.setPreference({ignoredThreads: newIgnoredThreads});
          setButtonState(true);
        }
      }
    });

    newDiv.appendChild(ignoreThreadButton);
  }

  const idiotBoxContainer = document.createElement('div');
  idiotBoxContainer.className = 'on3san-idiot-box-container';

  const idiotBox = document.createElement('input');
  idiotBox.type = 'text';
  idiotBox.className = 'on3san-idiot-box mdc-text-field__input';
  idiotBox.placeholder = `Type 'i am an idiot' to see super-ignored users' posts`;
  idiotBoxContainer.appendChild(idiotBox);
  newDiv.appendChild(idiotBoxContainer);

  idiotBox.addEventListener('input', event => {
    const currentInput = event.target as HTMLInputElement;
    const value = currentInput.value.toLowerCase().replace(/\s/g, '');

    // Sync the value across all idiot boxes.
    document
      .querySelectorAll<HTMLInputElement>('.on3san-idiot-box')
      .forEach(box => {
        if (box !== currentInput) {
          box.value = currentInput.value;
        }
      });

    if (value === 'iamanidiot') {
      document.body.classList.add('on3san-show-super-ignored');
    }
  });

  idiotBox.addEventListener('keyup', event => {
    if (event.key === 'Enter') {
      const value = idiotBox.value.toLowerCase().replace(/\s/g, '');
      if (value !== 'iamanidiot') {
        showSnackbar('Nope, try again.');
      }
    }
  });

  return newDiv;
}

function updateIdiotBoxVisibility() {
  console.log('!!! updateIBViz: function called');
  const idiotBoxes = document.querySelectorAll<HTMLElement>(
    '.on3san-idiot-box-container',
  );
  console.log('!!! updateIBViz: idiotBoxes found:', idiotBoxes);
  if (idiotBoxes.length > 0) {
    const isShowingAll = document.body.classList.contains('on3san-show-all');
    console.log('!!! updateIBViz: isShowingAll:', isShowingAll);
    const superIgnoredPost = document.querySelector(
      '.on3-sanifier-super-ignored-post',
    );
    console.log('!!! updateIBViz: superIgnoredPost found:', superIgnoredPost);
    idiotBoxes.forEach(box => {
      console.log('!!! updateIBViz: processing box:', box);
      if (isShowingAll && superIgnoredPost) {
        console.log('!!! updateIBViz: conditions met, making box visible.');
        box.classList.add('on3san-idiot-box-container--visible');
      } else {
        console.log('!!! updateIBViz: conditions not met, hiding box.');
        box.classList.remove('on3san-idiot-box-container--visible');
      }
    });
  }
}

function updateShowHiddenButtonState(
  button: HTMLButtonElement,
  hiddenCount: number,
  mode: string | undefined,
): void {
  if (hiddenCount === 0) {
    button.disabled = true;
    if (mode === 'inthread') {
      button.title = 'No posts are hidden';
    } else if (mode === 'inforum' || mode === 'inlist') {
      button.title = 'No threads are hidden';
    }
  } else {
    button.disabled = false;
    button.title = ''; // Clear tooltip when items are hidden
  }
}

function injectCustomDivs(
  hiddenPostsCount: number,
  hiddenThreadsCount: number,
  mode: string | undefined,
): void {
  // Inject the CSS for the snackbar.
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('popup.css');
  document.head.appendChild(link);

  // If a toolbar already exists, don't inject another one.
  if (document.querySelector('.on3san-toolbar')) {
    return;
  }

  const targetContainer = document.querySelector('.p-body-content');
  if (targetContainer) {
    const topToolbar = createToolbar(
      mode === 'inthread' ? hiddenPostsCount : hiddenThreadsCount,
      mode,
    );
    const bottomToolbar = createToolbar(
      mode === 'inthread' ? hiddenPostsCount : hiddenThreadsCount,
      mode,
    );
    targetContainer.prepend(topToolbar);
    targetContainer.append(bottomToolbar);
  }

  // Add the snackbar element to the body.
  const snackbar = document.createElement('div');
  snackbar.id = 'toast';
  document.body.appendChild(snackbar);
}

function injectSuperIgnoreButton(hovercard: HTMLElement): void {
  console.log('injectSuperIgnoreButton called with hovercard:', hovercard);
  // Check if the button already exists
  if (hovercard.querySelector('.on3san-super-ignore-button')) {
    console.log(
      'Super Ignore button already exists on this hovercard. Skipping.',
    );
    return;
  }

  const buttonGroup = hovercard.querySelector(
    '.memberTooltip-actions .buttonGroup',
  );
  const usernameElement = hovercard.querySelector(
    '.memberTooltip-name .username',
  ) as HTMLElement;

  if (buttonGroup && usernameElement) {
    console.log('buttonGroup and usernameElement found.', {
      buttonGroup,
      usernameElement,
    });
    const username = usernameElement.textContent?.trim();
    const userId = usernameElement.dataset.userId;

    if (username && userId) {
      console.log(
        `Attempting to inject button for user: ${username} (ID: ${userId})`,
      );
      const superIgnoreButton = document.createElement('button');
      superIgnoreButton.className =
        'mdc-button mdc-button--raised on3san-super-ignore-button'; // Add unique class
      superIgnoreButton.innerHTML =
        '<span class="mdc-button__label">Super Ignore</span>';
      new MDCRipple(superIgnoreButton);

      superIgnoreButton.addEventListener('click', async () => {
        const helpers = new On3Helpers();
        const isSuperIgnored = await helpers.toggleSuperIgnoreUser(username, userId);
        console.log(
          `User ${username} (ID: ${userId}) is now Super Ignored: ${isSuperIgnored}`,
        );
        // Optionally update button state or show a snackbar here
        void runSanifier(true); // Re-run sanifier to apply changes and show snackbar
      });

      buttonGroup.appendChild(superIgnoreButton);
      console.log('Super Ignore button appended.');
    } else {
      console.log('Username or userId not found.', {username, userId});
    }
  } else {
    console.log('buttonGroup or usernameElement not found.', {
      buttonGroup,
      usernameElement,
    });
  }
}

function showSnackbar(message: string): void {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => {
      toast.className = toast.className.replace('show', '');
    }, 3000);
  }
}

// Function to filter posts and threads based on user settings.
async function filterContentAndGetCounts(
  settings: any,
  document: Document,
  mode: string | undefined,
  helpers: On3Helpers,
): Promise<{hiddenPostsCount: number; hiddenThreadsCount: number}> {
  const hiddenPostsCount = await filterPosts(settings, document, helpers);
  const hiddenThreadsCount = filterThreads(settings, document);
  return {hiddenPostsCount, hiddenThreadsCount};
}

async function runSanifier(showSnackbarOnToggle = false): Promise<void> {
  if (!chrome.runtime?.id) return;
  const helpers = new On3Helpers();
  const mode = helpers.detectMode(window.location.href);

  // Inject custom divs immediately.
  injectCustomDivs(0, 0, mode); // Pass initial 0 counts, will be updated later

  // Await colorCodePostsByReactions to ensure authorId is set before filtering.
  await colorCodePostsByReactions();

  const settings = await helpers.getPreference({
    alwaysShowUsers: [],
    ignoredThreads: [],
    ignoreThreadsContaining: [],
    ratingThreshold: 0,
    debugMode: false,
    superIgnoredUsers: [],
  });

  const {hiddenPostsCount, hiddenThreadsCount} = await filterContentAndGetCounts(
    settings,
    document,
    mode,
    helpers,
  );

  // Update the button state after filtering for all toolbars.
  document
    .querySelectorAll<HTMLButtonElement>(
      '.on3san-toolbar .show-hidden-button',
    )
    .forEach(button => {
      updateShowHiddenButtonState(
        button,
        mode === 'inthread' ? hiddenPostsCount : hiddenThreadsCount,
        mode,
      );
    });

  if (showSnackbarOnToggle) {
    const isShowingAll =
      document.body.classList.contains('on3san-show-all');
    let message = '';
    if (mode === 'inthread') {
      message = isShowingAll
        ? `Displaying ${hiddenPostsCount} hidden posts.`
        : `Hiding ${hiddenPostsCount} posts.`;
    } else if (mode === 'inforum' || mode === 'inlist') {
      message = isShowingAll
        ? `Displaying ${hiddenThreadsCount} hidden threads.`
        : `Hiding ${hiddenThreadsCount} threads.`;
    }
    if (message) {
      showSnackbar(message);
    }
  }
}

chrome.runtime.onMessage.addListener(request => {
  if (request.action === 'toggleHidden') {
    const showHiddenButton = document.querySelector(
      '.on3san-toolbar .mdc-button',
    ) as HTMLButtonElement;
    if (showHiddenButton) {
      showHiddenButton.click(); // Simulate a click on the button
    }
  }
});

// Debounce function to limit how often a function is called.
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Run the filter when the page loads.
void runSanifier();

// Uses a MutationObserver to re-run the sanifier when the DOM changes.
// Debounce the runSanifier function to avoid excessive calls.
const debouncedRunSanifier = debounce(() => void runSanifier(), 500); // 500ms debounce

const targetNode = document.body;
if (targetNode) {
  const observer = new MutationObserver(mutations => {
    let newPostsAdded = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (
              node.matches('article.message') ||
              node.querySelector('article.message')
            ) {
              newPostsAdded = true;
            }
          }
        }
      }
    }

    if (newPostsAdded) {
      void debouncedRunSanifier(); // Re-run sanifier to filter new posts
    }

    // Always re-check all hovercards, as new ones might have appeared or data might have loaded.
    const hovercards = document.querySelectorAll('.tooltip--member');
    hovercards.forEach(hovercard => {
      injectSuperIgnoreButton(hovercard as HTMLElement);
    });
  });
  observer.observe(targetNode, {childList: true, subtree: true});
} else {
  console.warn('on3 Sanifier: Could not find .p-body-content to observe.');
}
