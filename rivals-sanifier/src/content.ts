// Function to filter posts and threads based on user settings
function filterContent(): void {
  chrome.storage.sync.get(['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoredKeywords'], (settings) => {
    const { blockedUsers, alwaysShowUsers, ignoredThreads, ignoredKeywords } = settings;

    // Filter posts by author
    document.querySelectorAll('article.forum-post').forEach((post: HTMLElement) => {
      const authorElement = post.querySelector('.author-info .username') as HTMLElement;
      if (authorElement) {
        const author = authorElement.textContent;
        if (author && blockedUsers && blockedUsers.includes(author)) {
          post.style.display = 'none';
        }
        if (author && alwaysShowUsers && alwaysShowUsers.includes(author)) {
          post.style.display = 'block';
        }
      }
    });

    // Filter threads by ID or keyword
    document.querySelectorAll('.thread-list-item').forEach((thread: HTMLElement) => {
      const titleElement = thread.querySelector('.thread-title') as HTMLElement;
      if (titleElement) {
        const title = titleElement.textContent?.toLowerCase();
        const threadId = thread.dataset.threadId;

        if (title && ignoredThreads) {
          for (const ignored of ignoredThreads) {
            if (threadId === ignored || title.includes(ignored.toLowerCase())) {
              thread.style.display = 'none';
              return; // Move to the next thread
            }
          }
        }

        if (title && ignoredKeywords) {
          for (const keyword of ignoredKeywords) {
            if (title.includes(keyword.toLowerCase())) {
              thread.style.display = 'none';
              return; // Move to the next thread
            }
          }
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


