// Inject CSS to hide threads
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

function injectCustomDivs(): void {
  const targetDivs = document.querySelectorAll('.block-outer');
  targetDivs.forEach(targetDiv => {
    // Check if our div already exists to avoid duplicates
    if (!targetDiv.previousElementSibling || !targetDiv.previousElementSibling.classList.contains('on3san-toolbar')) {
      const newDiv = document.createElement('div');
      newDiv.className = 'on3san-toolbar';

      const showHiddenButton = document.createElement('button');
      showHiddenButton.textContent = 'Show hidden';
      showHiddenButton.addEventListener('click', () => {
        document.body.classList.toggle('on3san-show-all');
        const isShowingAll = document.body.classList.contains('on3san-show-all');
        const newText = isShowingAll ? 'Sanify' : 'Show hidden';
        document.querySelectorAll('.on3san-toolbar button').forEach(button => {
          (button as HTMLElement).textContent = newText;
        });
      });

      newDiv.appendChild(showHiddenButton);
      targetDiv.parentNode?.insertBefore(newDiv, targetDiv);
    }
  });
}

// Function to filter posts and threads based on user settings
function filterContent(): void {
  chrome.storage.sync.get(['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoredKeywords'], (settings) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    const {
      blockedUsers = [],
      alwaysShowUsers = [],
      ignoredThreads = [],
      ignoredKeywords = []
    } = settings;

    // Filter posts by author
    document.querySelectorAll<HTMLElement>('article.message').forEach(post => {
      const author = post.dataset.author?.toLowerCase();
      if (!author) return;

      const lowercasedBlockedUsers = blockedUsers.map(u => u.toLowerCase());
      const lowercasedAlwaysShowUsers = alwaysShowUsers.map(u => u.toLowerCase());

      if (lowercasedBlockedUsers.includes(author)) {
        post.classList.add('on3-sanifier-hidden-post');
      } else if (lowercasedAlwaysShowUsers.includes(author)) {
        post.classList.remove('on3-sanifier-hidden-post');
      }
    });

    // Filter threads by ID or keyword
    document.querySelectorAll<HTMLElement>('.structItem--thread').forEach(thread => {
      const titleElement = thread.querySelector<HTMLElement>('h3.structItem-title a:last-of-type');
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

        if (!shouldHide && ignoredKeywords.length > 0) {
          for (const keyword of ignoredKeywords) {
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

// Run the filter when the page loads
runSanifier();

// We can use a MutationObserver for this.
const observer = new MutationObserver(runSanifier);
observer.observe(document.body, { childList: true, subtree: true });


