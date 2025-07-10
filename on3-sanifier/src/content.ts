import {
  colorCodePostsByReactions,
  filterPosts,
  filterThreads,
  On3Helpers,
} from './lib/helpers';
import {MDCRipple} from '@material/ripple';

function createToolbar(): HTMLElement {
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
  showHiddenButton.className = 'mdc-button mdc-button--raised';
  showHiddenButton.innerHTML =
    '<span class="mdc-button__label">Show hidden</span>';
  new MDCRipple(showHiddenButton);

  showHiddenButton.addEventListener('click', () => {
    document.body.classList.toggle('on3san-show-all');
    const isShowingAll = document.body.classList.contains('on3san-show-all');
    const newText = isShowingAll ? 'Sanify' : 'Show hidden';
    showHiddenButton.querySelector('.mdc-button__label')!.textContent = newText;
  });

  newDiv.appendChild(showHiddenButton);

  const helpers = new On3Helpers();
  const mode = helpers.detectMode(window.location.href);

  if (mode === 'inforum' || mode === 'inlist') {
    const openUnreadButton = document.createElement('button');
    openUnreadButton.className = 'mdc-button mdc-button--raised';
    openUnreadButton.innerHTML =
      '<span class="mdc-button__label">Open all unread in new tabs</span>';
    new MDCRipple(openUnreadButton);

    openUnreadButton.addEventListener('click', () => {
      helpers.openUnreadThreadsInTabs();
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

    const setButtonState = (isIgnored: boolean) => {
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
      void chrome.storage.sync.get('ignoredThreads', result => {
        const ignoredThreads = (result.ignoredThreads || []) as {
          id: string;
          title: string;
        }[];
        setButtonState(ignoredThreads.some(t => t.id === threadId));
      });
    }

    ignoreThreadButton.addEventListener('click', () => {
      if (threadId && threadTitle) {
        void chrome.storage.sync.get('ignoredThreads', result => {
          const ignoredThreads = (result.ignoredThreads || []) as {
            id: string;
            title: string;
          }[];
          const isIgnored = ignoredThreads.some(t => t.id === threadId);

          if (isIgnored) {
            const newIgnoredThreads = ignoredThreads.filter(
              t => t.id !== threadId,
            );
            void chrome.storage.sync.set({ignoredThreads: newIgnoredThreads});
            setButtonState(false);
          } else {
            const newIgnoredThreads = [
              ...ignoredThreads,
              {id: threadId, title: threadTitle},
            ];
            void chrome.storage.sync.set({ignoredThreads: newIgnoredThreads});
            setButtonState(true);
          }
        });
      }
    });

    newDiv.appendChild(ignoreThreadButton);
  }

  return newDiv;
}

function injectCustomDivs(): void {
  // If a toolbar already exists, don't inject another one.
  if (document.querySelector('.on3san-toolbar')) {
    return;
  }

  const targetContainer = document.querySelector('.p-body-content');
  if (targetContainer) {
    const topToolbar = createToolbar();
    const bottomToolbar = createToolbar();
    targetContainer.prepend(topToolbar);
    targetContainer.append(bottomToolbar);
  }
}

// Function to filter posts and threads based on user settings.
function filterContent(): void {
  if (!chrome.runtime?.id) return;
  chrome.storage.sync.get(
    [
      'blockedUsers',
      'alwaysShowUsers',
      'ignoredThreads',
      'ignoreThreadsContaining',
      'ratingThreshold',
      'debugMode',
    ],
    settings => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }

      filterPosts(settings, document);
      filterThreads(settings, document);
    },
  );
}

function runSanifier(): void {
  filterContent();
  injectCustomDivs();
  colorCodePostsByReactions();
}

// Run the filter when the page loads.
runSanifier();

// We can use a MutationObserver for this.
const observer = new MutationObserver(runSanifier);
observer.observe(document.body, {childList: true, subtree: true});
