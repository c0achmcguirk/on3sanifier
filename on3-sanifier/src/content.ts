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

    // Re-run the sanifier to update counts and show snackbar.
    runSanifier();
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
    const topToolbar = createToolbar();
    const bottomToolbar = createToolbar();
    targetContainer.prepend(topToolbar);
    targetContainer.append(bottomToolbar);
  }

  // Add the snackbar element to the body.
  const snackbar = document.createElement('div');
  snackbar.id = 'toast';
  document.body.appendChild(snackbar);
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

      const hiddenPostsCount = filterPosts(settings, document);
      const hiddenThreadsCount = filterThreads(settings, document);

      const helpers = new On3Helpers();
      const mode = helpers.detectMode(window.location.href);
      const isShowingAll = document.body.classList.contains('on3san-show-all');

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
    },
  );
}

function runSanifier(): void {
  filterContent();
  injectCustomDivs();
  colorCodePostsByReactions();
}

// Debounce function to limit how often a function is called.
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// Run the filter when the page loads.
runSanifier();

// Uses a MutationObserver to re-run the sanifier when the DOM changes.
// Debounce the runSanifier function to avoid excessive calls.
const debouncedRunSanifier = debounce(runSanifier, 500); // 500ms debounce

const targetNode = document.querySelector('.p-body-content');
if (targetNode) {
  const observer = new MutationObserver(debouncedRunSanifier);
  observer.observe(targetNode, {childList: true, subtree: true});
} else {
  console.warn('on3 Sanifier: Could not find .p-body-content to observe.');
}
