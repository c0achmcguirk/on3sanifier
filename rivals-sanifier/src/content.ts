// Inject CSS to hide threads
(async () => {
  try {
    const response = await fetch(chrome.runtime.getURL('dist/site-style.css'));
    const css = await response.text();
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  } catch (error) {
    console.error('Rivals Sanifier: Error injecting CSS', error);
  }
})();

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
    document.querySelectorAll<HTMLElement>('article.forum-post').forEach(post => {
      const authorElement = post.querySelector<HTMLElement>('.author-info .username');
      if (authorElement) {
        const author = authorElement.textContent;
        if (author && blockedUsers.includes(author)) {
          post.classList.add('rivals-sanifier-hidden-thread');
        }
        if (author && alwaysShowUsers.includes(author)) {
          post.classList.remove('rivals-sanifier-hidden-thread');
        }
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
          thread.classList.add('rivals-sanifier-hidden-thread');
        } else {
          thread.classList.remove('rivals-sanifier-hidden-thread');
        }
      }
    });
  });
}

// Run the filter when the page loads
filterContent();

// We can use a MutationObserver for this.
const observer = new MutationObserver(filterContent);
observer.observe(document.body, { childList: true, subtree: true });


