// Inject CSS to hide threads.
(async () => {
  try {
    const response = await fetch(chrome.runtime.getURL('dist/site-style.css'));
    const css = await response.text();
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  } catch (error) {
    console.error('on3 Sanifier: Error injecting CSS', error);
  }
})();

import { MDCRipple } from '@material/ripple';

function injectCustomDivs(): void {
  const targetDivs = document.querySelectorAll('.block-outer');
  targetDivs.forEach(targetDiv => {
    // Check if our div already exists to avoid duplicates.
    if (!targetDiv.previousElementSibling || !targetDiv.previousElementSibling.classList.contains('on3san-toolbar')) {
      const newDiv = document.createElement('div');
      newDiv.className = 'on3san-toolbar';

      const showHiddenButton = document.createElement('button');
      showHiddenButton.className = 'mdc-button mdc-button--raised';
      showHiddenButton.innerHTML = '<span class="mdc-button__label">Show hidden</span>';
      new MDCRipple(showHiddenButton);

      showHiddenButton.addEventListener('click', () => {
        document.body.classList.toggle('on3san-show-all');
        const isShowingAll = document.body.classList.contains('on3san-show-all');
        const newText = isShowingAll ? 'Sanify' : 'Show hidden';
        document.querySelectorAll('.on3san-toolbar button .mdc-button__label').forEach(buttonLabel => {
          (buttonLabel as HTMLElement).textContent = newText;
        });
      });

      newDiv.appendChild(showHiddenButton);
      targetDiv.parentNode?.insertBefore(newDiv, targetDiv);
    }
  });
}


// Function to filter posts and threads based on user settings.
function filterContent(): void {
  chrome.storage.sync.get(['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoreThreadsContaining'], (settings) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    const {
      blockedUsers = [],
      alwaysShowUsers = [],
      ignoredThreads = [],
      ignoreThreadsContaining = []
    } = settings;

    // Filter posts by author.
    document.querySelectorAll<HTMLElement>('article.message').forEach(post => {
      const author = post.dataset.author?.toLowerCase();
      if (!author) return;

      const lowercasedBlockedUsers = blockedUsers.map((u: string) => u.toLowerCase());
      const lowercasedAlwaysShowUsers = alwaysShowUsers.map((u: string) => u.toLowerCase());

      if (lowercasedBlockedUsers.includes(author)) {
        post.classList.add('on3-sanifier-hidden-post');
      } else if (lowercasedAlwaysShowUsers.includes(author)) {
        post.classList.remove('on3-sanifier-hidden-post');
      }
    });

    // Filter threads by ID or keyword.
    document.querySelectorAll<HTMLElement>('.structItem--thread').forEach(thread => {
      const titleElement = thread.querySelector<HTMLElement>('div.structItem-title a:last-of-type');
      if (titleElement) {
        const title = titleElement.textContent?.toLowerCase() || '';
        const threadId = thread.dataset.threadListItem;

        let shouldHide = false;

        if (ignoredThreads.length > 0) {
          for (const ignored of ignoredThreads) {
            if (threadId === ignored || title.includes(ignored.toLowerCase())) {
              shouldHide = true;
              break;
            }
          }
        }

        if (!shouldHide && ignoreThreadsContaining.length > 0) {
          for (const keyword of ignoreThreadsContaining) {
            if (title.includes(keyword.toLowerCase())) {
              shouldHide = true;
              break;
            }
          }
        }

        if (shouldHide) {
          thread.classList.add('on3-sanifier-hidden-thread');
        } else {
          thread.classList.remove('on3-sanifier-hidden-thread');
        }
      }
    });
  });
}

function runSanifier(): void {
  filterContent();
  injectCustomDivs();
}

// Run the filter when the page loads.
runSanifier();

// We can use a MutationObserver for this.
const observer = new MutationObserver(runSanifier);
observer.observe(document.body, { childList: true, subtree: true });


