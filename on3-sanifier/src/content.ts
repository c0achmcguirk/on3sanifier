import { MDCRipple } from '@material/ripple';

function createToolbar(): HTMLElement {
  const newDiv = document.createElement('div');
  newDiv.className = 'on3san-toolbar';

  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('o3s_logo_48.png');
  logo.style.height = '24px';
  logo.style.marginRight = '16px';

  // Add a tooltip to the logo
  const manifest = chrome.runtime.getManifest();
  const isFirefox = manifest.browser_specific_settings?.gecko?.id;
  logo.title = isFirefox ?
    'Toolbar from the on3 Sanifier add-on' :
    'Toolbar from the on3 Sanifier extension';

  newDiv.appendChild(logo);

  const showHiddenButton = document.createElement('button');
  showHiddenButton.className = 'mdc-button mdc-button--raised';
  showHiddenButton.innerHTML = '<span class="mdc-button__label">Show hidden</span>';
  new MDCRipple(showHiddenButton);

  showHiddenButton.addEventListener('click', () => {
    document.body.classList.toggle('on3san-show-all');
    const isShowingAll = document.body.classList.contains('on3san-show-all');
    const newText = isShowingAll ? 'Sanify' : 'Show hidden';
    document.querySelectorAll('.on3san-toolbar .mdc-button__label').forEach(buttonLabel => {
      (buttonLabel as HTMLElement).textContent = newText;
    });
  });

  newDiv.appendChild(showHiddenButton);
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


function getReactionCount(post: HTMLElement): number {
  const reactionsBarLink = post.querySelector<HTMLAnchorElement>('.reactionsBar-link');
  if (!reactionsBarLink) {
    return 0;
  }

  const linkHtml = reactionsBarLink.innerHTML;

  // Count the number of named users by counting the <bdi> tags.
  const bdiCount = (linkHtml.match(/<bdi>/g) || []).length;

  // Check for the "and X others" pattern to get the count of unnamed users.
  const andOthersMatch = linkHtml.match(/and (\d+) others/);
  const othersCount = andOthersMatch ? parseInt(andOthersMatch[1], 10) : 0;

  // If there are no <bdi> tags and no "others", but the link exists,
  // it means there is a single user.
  if (bdiCount === 0 && othersCount === 0 && reactionsBarLink.textContent?.trim()) {
    return 1;
  }

  return bdiCount + othersCount;
}

let debugMode = false;

function log(message: string) {
  if (debugMode) {
    console.log(`on3 Sanifier: ${message}`);
  }
}

// Function to filter posts and threads based on user settings.
function filterContent(): void {
  chrome.storage.sync.get(['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoreThreadsContaining', 'ratingThreshold', 'debugMode'], (settings) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    debugMode = settings.debugMode || false;
    const {
      blockedUsers = [],
      alwaysShowUsers = [],
      ignoredThreads = [],
      ignoreThreadsContaining = [],
      ratingThreshold = 0
    } = settings;

    // Filter posts by author and reaction count.
    document.querySelectorAll<HTMLElement>('article.message').forEach(post => {
      const author = post.dataset.author?.toLowerCase();
      if (!author) return;

      const lowercasedBlockedUsers = blockedUsers.map((u: string) => u.toLowerCase());
      const lowercasedAlwaysShowUsers = alwaysShowUsers.map((u: string) => u.toLowerCase());
      const reactionCount = getReactionCount(post);

      let hideReason = '';

      // Determine if the post should be hidden, with alwaysShowUsers taking precedence.
      if (lowercasedAlwaysShowUsers.includes(author)) {
        // This user's posts should always be shown, so we don't set a hideReason.
      } else if (lowercasedBlockedUsers.includes(author)) {
        hideReason = `author '${author}' is in the blocked user list.`;
      } else if (reactionCount < ratingThreshold) {
        hideReason = `it has ${reactionCount} reaction(s) and the rating threshold is ${ratingThreshold}.`;
      }

      if (hideReason) {
        log(`Hiding post by ${author} because ${hideReason}`);
        post.classList.add('on3-sanifier-hidden-post');
      } else {
        log(`Showing post by ${author}.`);
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

function colorCodePostsByReactions(): void {
  document.querySelectorAll<HTMLElement>('article.message').forEach(post => {
    const reactionCount = getReactionCount(post);
    let backgroundColor = '';
    if (reactionCount >= 16) {
      backgroundColor = '#efcb3e';
    } else if (reactionCount >= 10) {
      backgroundColor = '#f6dc76';
    } else if (reactionCount >= 5) {
      backgroundColor = '#faeaab';
    }

    post.style.backgroundColor = backgroundColor;
  });
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
observer.observe(document.body, { childList: true, subtree: true });


