/* eslint-disable no-console */
const NUM_IGNORED_THREADS_PREFKEYS = 20;
const DB_VERSION = 2;

export function getReactionCount(post: HTMLElement): number {
  const reactionsBarLink =
    post.querySelector<HTMLAnchorElement>('.reactionsBar-link');
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
  if (
    bdiCount === 0 &&
    othersCount === 0 &&
    reactionsBarLink.textContent?.trim()
  ) {
    return 1;
  }

  return bdiCount + othersCount;
}

export async function colorCodePostsByReactions(): Promise<void> {
  const helpers = new On3Helpers();
  const superIgnoredUsers = await helpers.getSuperIgnoredUsers();

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

    const avatar = post.querySelector<HTMLElement>(
      '.message-avatar-wrapper .avatar',
    );
    if (avatar) {
      const authorId = avatar.dataset.userId;
      if (authorId) {
        post.dataset.authorId = authorId;
        helpers.applySuperIgnore(post, superIgnoredUsers);
      }
    }
  });
}

let debugMode = false;

function log(message: string) {
  if (debugMode) {
    console.log(`on3 Sanifier: ${message}`);
  }
}

export function filterPosts(
  settings: {
    blockedUsers?: string[];
    alwaysShowUsers?: string[];
    ratingThreshold?: number;
    debugMode?: boolean;
    superIgnoredUsers?: User[];
  },
  document: Document,
  helpers: On3Helpers,
): number {
  debugMode = settings.debugMode || false;
  const {
    blockedUsers = [],
    alwaysShowUsers = [],
    ratingThreshold = 0,
    superIgnoredUsers = [],
  } = settings;

  let hiddenCount = 0;

  document.querySelectorAll<HTMLElement>('article.message').forEach(post => {
    const author = post.dataset.author?.toLowerCase();
    if (!author) return;

    const authorId = post.dataset.authorId;
    if (authorId && helpers.isSuperIgnored(authorId, superIgnoredUsers)) {
      helpers.applySuperIgnore(post, superIgnoredUsers);
    }

    const lowercasedAlwaysShowUsers = alwaysShowUsers.map((u: string) =>
      u.toLowerCase(),
    );
    const reactionCount = getReactionCount(post);

    let hideReason = '';

    if (lowercasedAlwaysShowUsers.includes(author)) {
      // This user's posts should always be shown, so we don't set a hideReason.
    } else if (blockedUsers.includes(author)) {
      hideReason = `author '${author}' is in the blocked user list.`;
    } else if (reactionCount < ratingThreshold) {
      hideReason = `it has ${reactionCount} reaction(s) and the rating threshold is ${ratingThreshold}.`;
    }

    if (hideReason) {
      log(`Hiding post by ${author} because ${hideReason}`);
      post.classList.add('on3-sanifier-hidden-post');
      hiddenCount++;
    } else {
      log(`Showing post by ${author}.`);
      post.classList.remove('on3-sanifier-hidden-post');
    }
  });

  return hiddenCount;
}

export function filterThreads(
  settings: {
    ignoredThreads?: string[];
    ignoreThreadsContaining?: string[];
  },
  document: Document,
): number {
  const {ignoredThreads = [], ignoreThreadsContaining = []} = settings;

  let hiddenCount = 0;

  document
    .querySelectorAll<HTMLElement>('.structItem--thread')
    .forEach(thread => {
      const threadId = thread.className.match(/js-threadListItem-(\d+)/)?.[1];
      if (threadId && settings.ignoredThreads?.some(t => t.id === threadId)) {
        thread.classList.add('on3-sanifier-hidden-thread');
        hiddenCount++;
        return;
      }

      const titleElement = thread.querySelector<HTMLElement>(
        'div.structItem-title a:last-of-type',
      );
      if (titleElement) {
        const title = titleElement.textContent?.toLowerCase() || '';

        let shouldHide = false;

        if (settings.ignoreThreadsContaining?.length > 0) {
          for (const keyword of settings.ignoreThreadsContaining) {
            if (title.includes(keyword.toLowerCase())) {
              shouldHide = true;
              break;
            }
          }
        }

        if (shouldHide) {
          thread.classList.add('on3-sanifier-hidden-thread');
          hiddenCount++;
        } else {
          thread.classList.remove('on3-sanifier-hidden-thread');
        }
      }
    });

  return hiddenCount;
}

export class On3Helpers {
  showingHidden = false;
  hiddenStatusText = '';
  showingStatusText = '';
  overrideStorage: chrome.storage.StorageArea | undefined = undefined;

  /**
   * Detects whether the currently viewed page is a list of threads or a list
   * of posts.
   * @param url The URL of the currently visible page.
   * @returns A string that indicates the mode the page is in.
   */
  detectMode(url: string): string | undefined {
    let retVal: string | undefined = undefined;
    if (url.includes('/threads/')) {
      retVal = 'inthread';
    } else if (url.includes('/forums/')) {
      retVal = 'inforum';
    } else if (url.includes('/forum/')) {
      retVal = 'inlist';
    }
    return retVal;
  }

  /**
   * Hides threads that are ignored based on a string they contain
   * or they were explicity hidden.
   * @returns A promise that can be used like this:
   *     `_on3.hideIgnoredThreads().then(
   *     (hiddenCount, hiddenPosters, hiddenTitles) => {})`;
   */
  hideIgnoredThreads(): Promise<{
    hiddenCount: number;
    hiddenPosters: string[];
    hiddenTitles: string[];
  }> {
    return new Promise(resolve => {
      void this.getPreference({
        ignoredThreads: [],
        ignoreThreadsContaining: [],
      }).then(items => {
        const ignoredThreads = items.ignoredThreads as string[];
        const ignoreThreadsContaining =
          items.ignoreThreadsContaining as string[];

        // Get all thread elements from the screen.
        const threads = document.querySelectorAll<HTMLElement>(
          '.structItem--thread',
        );
        let processed = 0;
        let hiddenCount = 0;
        const hiddenPosters: string[] = [];
        const hiddenTitles: string[] = [];
        threads.forEach(thread => {
          const poster = this.getThreadAuthor(thread);
          const title = this.getThreadTitle(thread);
          const threadId = this.getThreadId(thread);
          const shouldHide = this.shouldHideThread(
            threadId,
            title,
            ignoredThreads,
            ignoreThreadsContaining,
          );
          if (shouldHide) {
            this.addClass(thread, 'on3-sanifier-hidden-thread');
            hiddenCount++;
            this.pushUnique(hiddenTitles, title);
            this.pushUnique(hiddenPosters, poster);
          } else {
            this.removeClass(thread, 'on3-sanifier-hidden-thread');
          }
          processed++;
          if (processed === threads.length) {
            resolve({
              hiddenCount: hiddenCount,
              hiddenPosters: hiddenPosters,
              hiddenTitles: hiddenTitles,
            });
          }
        });
      });
    });
  }

  /**
   * Determines whether the thread should be hidden given the thread id, title
   * and the preferences.
   * @param id The thread id
   * @param title The thread title
   * @param forumId The forumId that the thread belongs to.
   * @param ignoredThreads The array of ignored threads preferences.
   * @param ignoreThreadsContaining Array of strings we are ignoring
   *    if they are in the strings
   * @param ignoredForums Array of forums we are ignoring.
   * @returns True if thread should be hidden, false otherwise.
   */
  shouldHideThread(
    id: string,
    title: string,
    ignoredThreads: string[],
    ignoreThreadsContaining: string[],
  ): boolean {
    if (ignoredThreads.length > 0) {
      for (const ignored of ignoredThreads) {
        if (id === ignored || title.includes(ignored.toLowerCase())) {
          return true;
        }
      }
    }

    if (ignoreThreadsContaining.length > 0) {
      for (const keyword of ignoreThreadsContaining) {
        if (title.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Determines whether the post should be hidden given the poster, votes, and the
   * list of ignored users and ignore threshold
   * @param poster - The poster (author) of the post
   * @param upvotes - The number of upvotes or likes
   * @param downvotes - The number of downvotes or dislikes on the post
   * @param ignoredUsers - Array of ignored users
   * @param alwaysShowUsers - Array of users we must always show
   * @param ignoreThreshold - The threshold the post must have for votes in order to be visible.
   * @returns
   */
  shouldHidePost(
    poster: string,
    upvotes: number,
    downvotes: number,
    ignoredUsers: string[],
    alwaysShowUsers: string[],
    ignoreThreshold: number,
  ): boolean {
    const _threshold = ignoreThreshold || -1;

    // if neverIgnore user....
    if (alwaysShowUsers.includes(poster.toLowerCase().trim())) {
      return false;
    }

    // check that the threshold is met
    if (upvotes < _threshold) {
      return true;
    }

    if (ignoredUsers.includes(poster.toLowerCase().trim())) {
      return true;
    }

    return false;
  }

  openUnreadThreadsInTabs(): void {
    const unreadThreads = document.querySelectorAll<HTMLElement>(
      '.structItem--thread.is-unread',
    );
    unreadThreads.forEach(thread => {
      if (!thread.classList.contains('on3-sanifier-hidden-thread')) {
        const link = thread.querySelector<HTMLAnchorElement>(
          'div.structItem-title a[data-tp-primary="on"]',
        );
        if (link?.href) {
          void chrome.runtime.sendMessage({action: 'openTab', url: link.href});
        }
      }
    });
  }

  /**
   * Generates the text displayed in the thread bar for current hidden mode of the page. This is meant for thread list view.
   * @param numHidden - The number of currently hidden threads
   * @param hiddenTitles - An array of hidden thread titles
   * @param inHideMode - true/false indicating if we are in hidden mode.
   */
  generateHiddenTextThreads(
    numHidden: number,
    hiddenTitles: string[],
    inHideMode: boolean,
  ): string {
    if (inHideMode) {
      if (numHidden === 0) {
        return 'There are no hidden threads on this screen.';
      } else if (numHidden === 1) {
        return `Hiding 1 thread ('${hiddenTitles[0]}').`;
      } else {
        let titleListString = '';
        hiddenTitles.forEach(title => {
          titleListString += `'${title}', `;
        });
        const titlesSliced = titleListString.slice(0, -2);
        return `Hiding ${numHidden} threads (${titlesSliced}).`;
      }
    } else {
      return 'Showing all threads.';
    }
  }

  /**
   * Generates the text displayed in the thread bar for the current hidden mode of the page. This is meant for posts view.
   * @param numHidden - the number of currently hidden posts
   * @param hiddenPosters - a list of posters that have their threads hidden
   * @param inHideMode - true/false indicating if we are in hidden mode
   */
  generateHiddenText(
    numHidden: number,
    hiddenPosters: string[],
    inHideMode: boolean,
  ): string {
    if (inHideMode) {
      if (numHidden === 0) {
        return 'There are no hidden posts on this screen.';
      } else if (numHidden === 1) {
        return `Hiding 1 post by ${hiddenPosters[0]}`;
      } else {
        let posterListString = '';
        hiddenPosters.forEach(poster => {
          posterListString += poster + ', ';
        });
        const postersSliced = posterListString.slice(0, -2);
        return `Hiding ${numHidden} posts by ${postersSliced}`;
      }
    } else {
      return 'Showing all posts.';
    }
  }

  /**
   * Convert string to number
   * @param inString - string to convert to a number
   */
  toInt(inString: string): number {
    try {
      return parseInt(inString.trim(), 10);
    } catch (_err) {
      return 0;
    }
  }

  /**
   * Hides the posts that should be ignored:
   *   - Because the poster is someone on your ignore list
   *   - Because the score threshold is invalid
   * @returns A promise
   */
  hideIgnoredPosts(): Promise<{hiddenCount: number; hiddenPosters: string[]}> {
    return new Promise(resolve => {
      void this.getPreference({
        ignoredUsers: [],
        alwaysShowUsers: [],
        ratingThreshold: 0,
      }).then(items => {
        const ignoredUsers = items.ignoredUsers as string[];
        const alwaysShowUsers = items.alwaysShowUsers as string[];
        const ignoreThreshold = items.ratingThreshold as number;
        // get all posts:
        const posts = document.querySelectorAll<HTMLElement>('.message--post');
        let processed = 0;
        let hiddenCount = 0;
        const hiddenPosters: string[] = [];
        posts.forEach(post => {
          const poster = this.getPoster(post);
          const likes = this.getLikes(post);
          const dislikes = 0;
          const shouldHide = this.shouldHidePost(
            poster,
            likes,
            dislikes,
            ignoredUsers,
            alwaysShowUsers,
            ignoreThreshold,
          );
          if (shouldHide) {
            //post.visibility = post.style.display = 'none';
            this.addClass(post, 'on3-hidden');
            hiddenCount++;
            this.pushUnique(hiddenPosters, poster);
          } else {
            this.removeClass(post, 'on3-hidden');
          }

          processed++;
          if (processed === posts.length) {
            resolve({hiddenCount: hiddenCount, hiddenPosters: hiddenPosters});
          }
        });
      });
    });
  }

  /**
   * Makes thread links go to a new tab when clicked, or removes the added
   * target attribute if `false` is passed in.
   * @param openInNewTab If `true` then a `target=_blank` will be
   *     added as an attribute on the link element. If `false` then that
   *     attribute will be set to `_self`, which means the link will open in
   *     the current window.
   */
  tweakThreadLinks(openInNewTab: boolean): void {
    const threadLinkMediaSelector = '.structItem-title>a[data-preview-url]';
    const threadLinks = document.querySelectorAll<HTMLAnchorElement>(
      threadLinkMediaSelector,
    );
    threadLinks.forEach(link => {
      if (openInNewTab) {
        link.setAttribute('target', '_blank');
        let href = link.getAttribute('href');
        // Add the '/unread' path to the URL if it isn't there to force
        // the link to open at the first unread post.
        if (href && !/\/unread$/.test(href)) {
          href += 'unread';
          link.setAttribute('href', href);
        }
      } else {
        link.setAttribute('target', '_self');
      }
    });
  }

  /**
   * Injects a bar at the top of forum pages, which shows the number of
   * hidden threads, a toggle button to toggle visibility for hidden threads,
   * and a button for ignoring the thread.
   */
  showForumTools(): void {
    void this.getIgnoredForums().then(ignoredForums => {
      let isIgnored = false;
      const forumId = this.getForumIdForThisForum();

      for (let i = 0, j = ignoredForums.length; i < j; i++) {
        if (ignoredForums[i].id === forumId) {
          isIgnored = true;
        }
      }

      const el = document.createElement('div');
      const elHTML = `
        <div class='ns-tb'>
          <div class='ns-tb-label'>
            on3 Sanifier
          </div>
          <button id='on3ToggleHide' class='btn'
            title='Show/Hide hidden posts (ALT-UP)'>Show Hidden
          </button>
          <span id='hiddenStatus'>There are no hidden posts on this page.</span>
          <button id='on3IgnoreForum' class='btn--red btn'
            title='Ignore this Forum'>Ignore Forum</button>
          <button id='on3StopIgnoringForum' class='btn--green btn'
            title='Ignore this Forum'>Stop Ignoring Forum</button>
          </li>
        </div>
      `;
      el.innerHTML = elHTML;
      const body = document.querySelector('div.p-body-pageContent');
      const alreadyExisting = document.querySelector('.ns-tb');
      if (body && !alreadyExisting) {
        body.parentNode?.insertBefore(el, body.parentNode.firstChild);
        document
          .getElementById('on3IgnoreForum')
          ?.addEventListener('click', evt => {
            this.onOn3IgnoreForumClicked(evt);
          });
        document
          .getElementById('on3StopIgnoringForum')
          ?.addEventListener('click', evt => {
            this.onOn3StopIgnoringForumClicked(evt);
          });
        document
          .getElementById('on3ToggleHide')
          ?.addEventListener('click', evt => {
            this.onOn3ToggleHideClicked(evt);
          });
        this.showIgnoreFab((evt: MouseEvent) => {
          this.onOn3ToggleHideClicked(evt);
        });
      }

      this.indicateThisForumIsIgnored(isIgnored);
    });
  }

  /**
   * Injects a button in the `uix_fabBar` that toggles hidden posts/threads.
   * @param handler The function to call when the fab is
   *      clicked.
   */
  showIgnoreFab(handler: (event: MouseEvent) => void): void {
    const el = document.createElement('a');
    this.addClass(el, 'button--scroll');
    this.addClass(el, 'button');
    this.addClass(el, 'rippleButton');
    el.setAttribute('title', 'Toggle Hidden');
    el.setAttribute('id', 'on3ToggleHideFab');
    const elHTML = `
          <span class="button-text">
            <i class="fa--xf far fa-eye" aria-hidden="true"></i>
            <span class="u-srOnly">Show All</span>
          </span>
        <div class="ripple-container"></div>`;

    el.innerHTML = elHTML;
    const buttonBar = document.querySelector('.uix_fabBar>.u-scrollButtons');
    if (buttonBar) {
      buttonBar.insertBefore(el, buttonBar.firstChild);
      document
        .getElementById('on3ToggleHideFab')
        ?.addEventListener('click', handler);
    }
  }

  /**
   * Injects a bar at the top of thread pages, which shows the number of
   * hidden threads and gives you a button that will toggle hiding or showing
   * threads.
   */
  showThreadTools(): void {
    void this.getIgnoredThreads().then(ignoredThreads => {
      let isIgnored = false;
      const threadId = this.getThreadIdForThisThread();

      for (let i = 0, j = ignoredThreads.length; i < j; i++) {
        if (ignoredThreads[i].id === threadId) {
          isIgnored = true;
        }
      }
      const el = document.createElement('div');
      const elHTML = `
          <div class='ns-tb'>
            <div class='ns-tb-label'>
              on3 Sanifier
            </div>
            <button id='on3ToggleHide' class='btn'
              title='Show/Hide hidden posts (ALT-UP)'>Show Hidden
            </button>
            <span id='hiddenStatus'>There are no hidden posts on this page.</span>
            <button id='on3IgnoreThread' class='btn--red btn'
              title='Ignore this thread'>Ignore Thread</button>
            <button id='on3StopIgnoringThread' class='btn--green btn'
              title='Ignore this Thread'>Stop Ignoring Thread</button>
            </li>
          </div>
        `;
      el.innerHTML = elHTML;

      const body = document.querySelector('div.p-body-pageContent');
      const alreadyExisting = document.querySelector('.ns-tb');
      if (body && !alreadyExisting) {
        body.parentNode?.insertBefore(el, body.parentNode.firstChild);
        document
          .getElementById('on3IgnoreThread')
          ?.addEventListener('click', evt => {
            this.onOn3IgnoreThreadClicked(evt);
          });
        document
          .getElementById('on3StopIgnoringThread')
          ?.addEventListener('click', evt => {
            this.onOn3StopIgnoringThreadClicked(evt);
          });
        document
          .getElementById('on3ToggleHide')
          ?.addEventListener('click', evt => {
            this.onOn3ToggleHideClicked(evt);
          });
        this.showIgnoreFab((evt: MouseEvent) => {
          this.onOn3ToggleHideClicked(evt);
        });
      }

      this.indicateThisThreadIsIgnored(isIgnored);
    });
  }

  /**
   * Adds a value to a preference array. It enforces a unique value, so if
   * something already exists in the list, it won't be in there twice.
   * @param prefKey The preference key to store under.
   * @param prefVal The value to add to the preference list.
   * @returns A promise that can be used like this:
   *     `addPrefValToSet(key, val).then((key {string}, items {array})`
   */
  addPrefValToSet(
    prefKey: string,
    prefVal: any,
  ): Promise<{prefKey: string; items: any[]}> {
    return new Promise(resolve => {
      const setObj: {[key: string]: any[]} = {};
      setObj[prefKey] = [];
      void this.getPreference(setObj).then(items => {
        const arrItems = items[prefKey] as any[];
        this.pushUnique(arrItems, prefVal);
        const newObj: {[key: string]: any[]} = {};
        newObj[prefKey] = arrItems;
        void this.setPreference(newObj).then(() => {
          resolve({prefKey: prefKey, items: arrItems});
        });
      });
    });
  }

  /**
   * Handles the click of the Stop Ignoring Thread button in the turbo bar.
   * This method removes the thread id and the title from storage so the
   * thread will start being seen again.
   * @param evt The button click event.
   * @returns Returns false to prevent button click event bubbling.
   * @private
   */
  onOn3StopIgnoringThreadClicked(evt: MouseEvent): boolean {
    evt.stopPropagation();
    evt.preventDefault();

    const threadId = this.getThreadIdForThisThread();

    if (threadId) {
      void this.removeIgnoredThreadById(parseInt(threadId, 10)).then(() => {
        this.indicateThisThreadIsIgnored(false);
      });
    } else {
      console.warn(
        `Warning when trying to stop ignoring thread. threadId (${threadId}) was undefined`,
      );
    }
    return false;
  }

  /**
   * Read the threadId from the HTML element at the top of the Thread page.
   * @returns The threadId of the page.
   * @private
   */
  getThreadIdForThisThread(): string | undefined {
    let threadId: string | undefined;
    const htmlEl = document.querySelector('html');

    if (htmlEl) {
      const dataKey = htmlEl.getAttribute('data-content-key');
      if (dataKey) {
        threadId = dataKey.substring(7);
      }
    }

    return threadId;
  }

  /**
   * Handles the click of the Ignore Thread button in the thread tools bar.
   * This method saves the ignored thread id and title in storage so the
   * thread can be ignored.
   * @param evt The thread click event.
   * @returns
   */
  onOn3IgnoreThreadClicked(evt: MouseEvent): boolean {
    evt.stopPropagation();
    evt.preventDefault();

    const threadId = this.getThreadIdForThisThread();
    let title: string | undefined;

    const titleEl = document.querySelector('h1.p-title-value');
    if (titleEl) {
      title = titleEl.textContent || '';
    }

    if (threadId && title) {
      void this.saveIgnoredThread(threadId, title).then(() => {
        this.indicateThisThreadIsIgnored(true);
      });
    } else {
      console.warn(
        `Warning when trying to ignore thread. Either threadId (${threadId}) or title (${title} were undefined`,
      );
    }
    return false;
  }

  /**
   * Saves an ignored thread (id, title) to storage. In order to allow for more ignored threads (4 KB limit per key), it
   * splits up the saved threads into 20 keys based on a threadId-mod20 index method.
   *
   * If you'd like to see the prefKey used along with the saved thread object
   * (and all the keys stored) use the promise that is returned.
   * @param threadId - The unique thread id (as specified by vBulletin)
   * @param threadTitle - The title of the thread you are ignoring
   * @returns Promise that returns with signature `(prefKey, savedObj, newObj) => {}`
   */
  saveIgnoredThread(
    threadId: string,
    threadTitle: string,
  ): Promise<{
    prefKey: string;
    savedObj: {id: string; title: string};
    newObj: any[];
  }> {
    return new Promise(resolve => {
      const prefKey = `ignoredThreads_${this.pad(
        parseInt(threadId, 10) % NUM_IGNORED_THREADS_PREFKEYS,
        2,
      )}`; // currently 20

      const savedObj = {
        id: threadId,
        title: threadTitle,
      };

      void this.addPrefValToSet(prefKey, savedObj).then(({prefKey, items}) => {
        resolve({prefKey: prefKey, savedObj: savedObj, newObj: items});
      });
    });
  }

  /**
   * Returns all the ignored threads stored in the 20 slots for preferences
   * @returns Ignored threads returned with signature
   *    `ignoredThreads {Array:Object})`
   */
  getIgnoredThreads(): Promise<{id: string}[]> {
    return new Promise(resolve => {
      let retObj: {id: string}[] = [];
      const prefObj: {[key: string]: any[]} = {};

      for (let i = 0, j = NUM_IGNORED_THREADS_PREFKEYS; i < j; i++) {
        const key = `ignoredThreads_${this.pad(i, 2)}`;
        prefObj[key] = [];
      }

      void this.getPreference(prefObj).then(items => {
        for (const key in items) {
          if (
            Object.prototype.hasOwnProperty.call(items, key) &&
            items[key] &&
            Array.isArray(items[key])
          ) {
            retObj = retObj.concat(items[key]);
          }
        }
        resolve(retObj);
      });
    });
  }

  /**
   * Removes an individual ignored thread by it's thread id. If you'd like to
   * have all the ignored threads returned, use the returned promise.
   * @param threadId The thread ID you'd like to remove from the
   *     preferences.
   * @returns a promise with the signature of (ignoredThreads) =>
   *     {};
   */
  removeIgnoredThreadById(threadId: number): Promise<{id: string}[]> {
    return new Promise(resolve => {
      const storedAt = threadId % NUM_IGNORED_THREADS_PREFKEYS;
      const key = `ignoredThreads_${this.pad(storedAt, 2)}`;
      const prefObj: {[key: string]: any[]} = {};
      prefObj[key] = [];

      void this.getPreference(prefObj).then(items => {
        for (let i = 0, j = items[key].length; i < j; i++) {
          const obj = items[key][i];
          if (obj.id === threadId) {
            items[key].splice(i, 1);
            break;
          }
        }
        prefObj[key] = items[key];
        void this.setPreference(prefObj).then(() => {
          void this.getIgnoredThreads().then(allThreads => {
            resolve(allThreads);
          });
        });
      });
    });
  }

  /**
   * Removes all the ignored threads from storage
   * @returns a promise that has an empty signature.
   */
  clearAllIgnoredThreads(): Promise<void> {
    return new Promise(resolve => {
      for (let i = 0; i < NUM_IGNORED_THREADS_PREFKEYS; i++) {
        const key = `ignoredThreads_${this.pad(i, 2)}`;
        const prefObj: {[key: string]: any[]} = {};
        prefObj[key] = [];
        void this.setPreference(prefObj);
      }

      resolve();
    });
  }

  /**
   * Pads a number with a specific number of 0's.
   * @param num The number you are padding.
   * @param size The size of the string returned with padded 0's.
   * @returns The padded number string.
   */
  pad(num: number, size: number): string {
    const s = '000000000' + num;
    return s.substr(s.length - size);
  }

  /**
   * Hides the ignore thread button, shows the hidden status in the turbo
   * bar.
   * @param isHidden The hidden status of the thread.
   * @private
   */
  indicateThisThreadIsIgnored(isHidden: boolean): void {
    const btnIgnoreEl = document.getElementById(
      'on3IgnoreThread',
    ) as HTMLElement;
    const btnStopIgnoringEl = document.getElementById(
      'on3StopIgnoringThread',
    ) as HTMLElement;
    if (btnIgnoreEl && btnStopIgnoringEl) {
      if (isHidden) {
        btnIgnoreEl.style.display = 'none';
        btnStopIgnoringEl.style.display = '';
      } else {
        btnIgnoreEl.style.display = '';
        btnStopIgnoringEl.style.display = 'none';
      }
    }
  }

  /**
   * Hides the ignore forum button, shows the hidden status in the forum bar.
   * @param isHidden The hidden status of the forum.
   * @private
   */
  indicateThisForumIsIgnored(isHidden: boolean): void {
    const btnIgnoreEl = document.getElementById(
      'on3IgnoreForum',
    ) as HTMLElement;
    const btnStopIgnoringEl = document.getElementById(
      'on3StopIgnoringForum',
    ) as HTMLElement;
    if (btnIgnoreEl && btnStopIgnoringEl) {
      if (isHidden) {
        btnIgnoreEl.style.display = 'none';
        btnStopIgnoringEl.style.display = '';
      } else {
        btnIgnoreEl.style.display = '';
        btnStopIgnoringEl.style.display = 'none';
      }
    }
  }

  /**
   * Handle the Show Hidden/Hide Ignored button click in the thread list.
   * @param evt The button click event.
   * @returns Always returns false to prevent the button click from
   *     hiding the buttons.
   */
  onOn3ToggleHideThreadsClicked(evt: MouseEvent): boolean {
    evt.stopPropagation();
    evt.preventDefault();
    this.showingHidden = !this.showingHidden;
    const threadList = document.querySelector('.structItemContainer');
    const toggleButton = document.getElementById(
      'on3ToggleHideThreads',
    ) as HTMLElement;

    if (threadList) {
      if (this.showingHidden) {
        this.addClass(threadList, 'on3-show-hidden');
        if (toggleButton) {
          toggleButton.innerHTML = 'Hide Ignored';
          this.updateStatusText(this.showingStatusText);
        }
      } else {
        this.removeClass(threadList, 'on3-show-hidden');
        if (toggleButton) {
          toggleButton.innerHTML = 'Show Hidden';
          this.updateStatusText(this.hiddenStatusText);
        }
      }
    }

    this.indicateFabIsInHiddenMode();
    return false;
  }

  /**
   * Handle the Show Hidden/Hide Ignored button click in the post list.
   * @param evt The click event raised by the user.
   * @returns Always returns `false` to prevent the mouse click from
   *     interfering with the page.
   * @private
   */
  onOn3ToggleHideClicked(evt: MouseEvent): boolean {
    evt.stopPropagation();
    evt.preventDefault();

    this.showingHidden = !this.showingHidden;
    const postList = document.querySelectorAll<HTMLElement>('div.block');
    const toggleButton = document.getElementById(
      'on3ToggleHide',
    ) as HTMLElement;

    if (postList) {
      if (this.showingHidden) {
        postList.forEach(el => {
          this.addClass(el, 'on3-show-hidden');
        });
        if (toggleButton) {
          toggleButton.innerHTML = 'Hide Ignored';
          this.updateStatusText(this.showingStatusText || '');
        }
      } else {
        postList.forEach(el => {
          this.removeClass(el, 'on3-show-hidden');
        });
        if (toggleButton) {
          toggleButton.innerHTML = 'Show Hidden';
          this.updateStatusText(this.hiddenStatusText || '');
        }
      }
    }

    this.indicateFabIsInHiddenMode();
    return false;
  }

  /**
   * Sets the show hidden fab button that we are showingHidden or not.
   * @private
   */
  indicateFabIsInHiddenMode(): void {
    const fabButton = document.getElementById('on3ToggleHideFab');
    if (fabButton) {
      const icon = fabButton.querySelector('span>i');
      if (icon) {
        if (this.showingHidden) {
          this.addClass(fabButton, 'on3-show-hidden-fab');
          this.removeClass(icon, 'fa-eye');
          this.addClass(icon, 'fa-eye-slash');
        } else {
          this.removeClass(fabButton, 'on3-show-hidden-fab');
          this.removeClass(icon, 'fa-eye-slash');
          this.addClass(icon, 'fa-eye');
        }
      }
    }
  }

  /**
   * Updates the number of hidden posts, by whom, etc.
   * @param numHidden the number of hidden posts.
   * @param hiddenPosters the posters who have ignored posts.
   */
  updateNumHidden(numHidden: number, hiddenPosters: string[]): void {
    const inHideMode = !this.showingHidden;
    this.hiddenStatusText = this.generateHiddenText(
      numHidden,
      hiddenPosters,
      true,
    );
    this.showingStatusText = this.generateHiddenText(
      numHidden,
      hiddenPosters,
      false,
    );
    const statusEl = document.getElementById('hiddenStatus');
    let text: string | undefined = undefined;
    if (statusEl) {
      if (inHideMode) {
        text = this.hiddenStatusText;
      } else {
        text = this.showingStatusText;
      }
      this.updateStatusText(text);
    }
  }

  /**
   * Updates the hiddent text string for hidden threads.
   * @param numHidden number of hidden threads.
   * @param hiddenTitles hidden thread titles.
   */
  updateNumHiddenThreads(numHidden: number, hiddenTitles: string[]): void {
    const inHideMode = !this.showingHidden;
    this.hiddenStatusText = this.generateHiddenTextThreads(
      numHidden,
      hiddenTitles,
      true,
    );
    this.showingStatusText = this.generateHiddenTextThreads(
      numHidden,
      hiddenTitles,
      false,
    );
    const statusEl = document.getElementById('hiddenStatus');
    let text: string | undefined = undefined;
    if (statusEl) {
      if (inHideMode) {
        text = this.hiddenStatusText;
      } else {
        text = this.showingStatusText;
      }
      this.updateStatusText(text);
    }
  }

  /**
   * Updates the status of the thread tools bar (showing posts)
   * @param text - The text to display in the tools bar
   */
  updateStatusText(text: string): void {
    const statusEl = document.getElementById('hiddenStatus');
    if (statusEl) {
      statusEl.innerHTML = text;
      statusEl.setAttribute('title', text);
    }
  }

  /**
   * Shows the turbo bar at the top of the thread list. It has on3-specific
   * options
   */
  showTurboBar(): void {
    const turboEl = document.createElement('div');

    const barHTML = `
        <div class='ns-tb'>
          <div class='ns-tb-label'>
            on3 Sanifier
          </div>
<button id='on3ToggleHideThreads' class='btn'
title='Show/Hide hidden threads (ALT-UP)'>Show Hidden</button>
<span id='hiddenStatus'>There are no hidden threads on this page.</span>
          <button id='on3OpenTabs' class='btn btn--green'
            title='Open each thread with new posts in a new tab'>
            Open New Posts in Tabs
          </button>
        </div>
      `;

    turboEl.innerHTML = barHTML;

    const body = document.querySelector('div.p-body-pageContent');
    const alreadyExisting = document.querySelector('.ns-tb');
    if (body && !alreadyExisting) {
      body.parentNode?.insertBefore(turboEl, body.parentNode.firstChild);
      document.getElementById('on3OpenTabs')?.addEventListener('click', () => {
        this.onOn3OpenTabsClicked();
      });
      document
        .getElementById('on3ToggleHideThreads')
        ?.addEventListener('click', evt => {
          this.onOn3ToggleHideThreadsClicked(evt);
        });
      this.showIgnoreFab((evt: MouseEvent) => {
        this.onOn3ToggleHideThreadsClicked(evt);
      });
    }
  }

  /**
   * Gets the visibility state of the element passed in.
   * @param el Element you are looking up the visibility for.
   * @returns `true` if the element is visible, `false` otherwise.
   */
  isVisible(el: HTMLElement): boolean {
    const isHidden = el.offsetParent === null;
    return !isHidden;
  }

  onOn3OpenTabsClicked(): void {
    this.tweakThreadLinks(true);
    const threadLinks = document.querySelectorAll<HTMLElement>(
      '.structItem-title>a[data-preview-url]',
    );
    threadLinks.forEach(link => {
      if (this.isVisible(link)) {
        link.click();
      }
    });
    this.tweakThreadLinks(false);
  }

  /**
   * Gets the name of the poster
   * @param post - the post element
   */
  getPoster(post: Element): string {
    try {
      const author = (post as HTMLElement).dataset.author;
      if (author) {
        return author.toLowerCase();
      } else {
        return 'NOPOSTERFOUND';
      }
    } catch (_err) {
      console.warn('on3 Chrome Extension Error: ' + _err);
      return 'NOPOSTERFOUND';
    }
  }

  /**
   * Gets the name of the author of a thread
   * @param thread - the thread element
   * @returns The name of the poster/author.
   */
  getThreadAuthor(thread: Element): string {
    try {
      const author = (thread as HTMLElement).dataset.author;
      if (author) {
        return author.toLowerCase();
      } else {
        return 'NOAUTHORFOUND';
      }
    } catch (_err) {
      console.warn('on3 Chrome Extension Error: ' + _err);
      return 'NOAUTHORFOUND';
    }
  }

  /**
   * Gets the title of the thread
   * @param thread - the thread element
   * @returns The title of the thread
   */
  getThreadTitle(thread: Element): string {
    try {
      const tmpEl = thread.querySelector(
        '.structItem-title>a[data-preview-url]',
      );
      if (tmpEl) {
        const title = tmpEl.innerHTML.toLowerCase();
        return title;
      } else {
        return 'NOTITLEFOUND';
      }
    } catch (_err) {
      console.warn('on3 Chrome Extension Error: ' + _err);
      return 'NOTITLEFOUND';
    }
  }

  /**
   * Gets the thread ID based on the thread element (works in thread list mode)
   * @param thread - the thread element
   * @returns The thread ID.
   */
  getThreadId(thread: Element): string {
    try {
      const el = thread.querySelector<HTMLAnchorElement>(
        '.structItem-title>a[data-preview-url]',
      );
      if (el) {
        const url = el.getAttribute('href');
        if (url) {
          const threadId = this.getThreadIdFromUrl(url);
          return threadId || 'NOTITLEFOUND';
        }
      }
      return 'NOTITLEFOUND';
    } catch (_err) {
      console.warn('on3 Chrome Extension Error: ' + _err);
      return 'NOTITLEFOUND';
    }
  }

  /**
   * Gets the thread ID from the URL that is passed in.
   * @param url The URL of the thread that contains the thread ID.
   * @returns The thread ID.
   */
  getThreadIdFromUrl(url: string): string | undefined {
    const regex = /threads\/.+\.(\d+)\//;
    const matches = regex.exec(url);
    if (matches) {
      return matches[1];
    } else {
      return undefined;
    }
  }

  getThreadTitleFromUrl(url: string): string | undefined {
    const regex = /threads\/(.+)\.(\d+)\//;
    const matches = regex.exec(url);
    if (matches) {
      return matches[1].replace(/-/g, ' ');
    } else {
      return undefined;
    }
  }

  /**
   * Gets the number of likes (upvotes) received for the given post.
   * @param post - the post element
   * @returns
   */
  getLikes(post: Element): number {
    try {
      let numLikes = 0;
      const reactionsBarEl = post.querySelector('.reactionsBar-link');
      if (reactionsBarEl) {
        numLikes += this.getLikesInReactionBar(reactionsBarEl.innerHTML);
      }

      const reactionsListEl = post.querySelector('.reactions-left');
      if (reactionsListEl) {
        numLikes += this.getLikesInReactionList(reactionsListEl);
      }
      return numLikes;
    } catch (_err) {
      console.warn('on3 Chrome Extension Error: ' + _err);
      return 0;
    }
  }

  /**
   * Gets the number of reactions in the reactions bar based on the text
   * showing.
   * @param likesString The text of the reaction bar.
   * @returns
   */
  getLikesInReactionBar(likesString: string | null): number {
    if (likesString) {
      const numCommas = (likesString.match(/,/g) || []).length;
      const numAnds = (likesString.match(/\band\b/g) || []).length;
      const regex = /and (\d+) others$/;
      const matches = regex.exec(likesString);
      if (matches) {
        const numOthers = this.toInt(matches[1]);
        return numCommas + numAnds + numOthers;
      }
      return 1 + numCommas + numAnds;
    }
    return 0;
  }

  /**
   * Gets the number of reactions in the list of reaction elements in the
   * reaction list.
   * @param listEl The DOM element that contains the list of
   *   reactions.
   * @returns The total number of reactions.
   */
  getLikesInReactionList(listEl: Element): number {
    if (listEl) {
      const reactionEls = listEl.querySelectorAll('.reaction-count');
      let numLikes = 0;
      for (let i = 0; i < reactionEls.length; i++) {
        numLikes += this.toInt(reactionEls[i].innerHTML);
      }
      return numLikes;
    }
    return 0;
  }

  setOverrideStorage(obj: chrome.storage.StorageArea): void {
    this.overrideStorage = obj;
  }

  getStorageArea(): chrome.storage.StorageArea {
    if (this.overrideStorage) {
      return this.overrideStorage;
    } else if (
      chrome &&
      chrome.extension &&
      chrome.extension.inIncognitoContext
    ) {
      return chrome.storage.local;
    } else {
      return chrome.storage.sync;
    }
  }

  /**
   * Sets the preference in storage.
   * @returns a promise that has the signature of (bytesInUse) => {}
   */
  setPreference(prefObj: {[key: string]: any}): Promise<void> {
    return new Promise(resolve => {
      const storage = this.getStorageArea();
      storage.set(prefObj, () => {
        resolve();
      });
    });
  }

  /**
   * Gets the stored preference from the storage area
   * @param prefObj - the preference object key(s) with default values
   * @returns a promise with the signature of (val) => {}
   */
  getPreference(prefObj: {[key: string]: any}): Promise<{[key: string]: any}> {
    return new Promise(resolve => {
      const storage = this.getStorageArea();
      storage.get(prefObj, val => {
        resolve(val);
      });
    });
  }

  /**
   * Removes a stored preference by key
   * @param key - the storage key for the preference you are removing.
   * @returns which can be called like retVal.then(onRemoved, onError);
   */
  removePreference(key: string | string[]): Promise<void> {
    const storage = this.getStorageArea();
    return storage.remove(key);
  }

  /**
   * Adds a CSS class to an element, if it doesn't have it.
   * @param el - the DOM element
   * @param className - the CSS class to apply to the element
   */
  addClass(el: Element, className: string): void {
    if (el.classList) el.classList.add(className);
    else el.className += ' ' + className;
  }

  /**
   * Removes a CSS class to an element, if it exists.
   * @param el - the DOM element
   * @param className - the CSS class to remove from the element
   */
  removeClass(el: Element, className: string): void {
    if (el.classList) el.classList.remove(className);
    else
      el.className = el.className.replace(
        new RegExp(
          '(^|\\b)' + className.split(' ').join('|') + '(\\b|$)',
          'gi',
        ),
        ' ',
      );
  }

  /**
   * Push the item into the array if it doesn't already exist. It handles primitives or arrays of objects with an id property
   * @param array - The array of items we are interacting with
   * @param newItem - The item we'd like to put into the array if it doesn't already exist there.
   * @returns the array of items
   */
  pushUnique(array: any[], newItem: any): any[] {
    if (typeof newItem === 'object' && newItem !== null) {
      if (newItem.id) {
        const found = array.find(obj => {
          return obj.id === newItem.id;
        });
        if (found === null) {
          array.push(newItem);
        }
      }
    } else {
      if (array.indexOf(newItem) === -1) {
        array.push(newItem);
      }
    }

    return array;
  }

  /**
   * Initialize the extension. Perform database migrations and other
   * housekeeping tasks.
   * @returns a promise with an empty signature on completion.
   */
  init(): Promise<void> {
    return new Promise(resolve => {
      void this.getPreference({dbVersion: 0}).then(items => {
        if (items.dbVersion < 1) {
          items.dbVersion = 1;
        }

        if (items.dbVersion < DB_VERSION) {
          void this.migrateDatabase(items.dbVersion, DB_VERSION).then(() => {
            void this.setPreference({dbVersion: DB_VERSION});
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Migrates the database to a new version, fixing saved values that are outdated.
   * @param currentVersion The current, outdated version number.
   * @param targetVersion The version we need to migrate to.
   * @returns A promise with an empty signature.
   */
  migrateDatabase(
    currentVersion: number,
    targetVersion: number,
  ): Promise<void> {
    return new Promise(resolve => {
      if (targetVersion === 2 && currentVersion < 2) {
        // remove all ignored threads because the old vBulletin ignored
        // threads have different thread IDs so we need to start over.
        void this.removePreference('ignoredThreads');
        for (let i = 0, j = NUM_IGNORED_THREADS_PREFKEYS; i < j; i++) {
          const key = `ignoredThreads_${this.pad(i, 2)}`;
          void this.removePreference(key);
        }
      }
      resolve();
    });
  }

  /**
   * Toggles the super ignore status for a given user.
   * @param username The username to toggle.
   * @param userId The user ID to toggle.
   * @returns A promise that resolves with the new super ignored status (true if super ignored, false otherwise).
   */
  async toggleSuperIgnoreUser(
    username: string,
    userId: string,
  ): Promise<boolean> {
    const superIgnoredUsers = await this.getSuperIgnoredUsers();
    const isSuperIgnored = this.isSuperIgnored(userId, superIgnoredUsers);

    if (isSuperIgnored) {
      const newSuperIgnoredUsers = superIgnoredUsers.filter(
        user => user.id !== userId,
      );
      await this.setPreference({superIgnoredUsers: newSuperIgnoredUsers});
      return false;
    } else {
      const newSuperIgnoredUsers = [
        ...superIgnoredUsers,
        {id: userId, name: username},
      ];
      await this.setPreference({superIgnoredUsers: newSuperIgnoredUsers});
      return true;
    }
  }

  /**
   * Gets the list of super-ignored users.
   * @returns A promise that resolves with an array of super-ignored users.
   */
  async getSuperIgnoredUsers(): Promise<User[]> {
    const items = await this.getPreference({superIgnoredUsers: []});
    return items.superIgnoredUsers as User[];
  }

  /**
   * Checks if a user is super-ignored.
   * @param userId The user ID to check.
   * @param superIgnoredUsers The list of super-ignored users.
   * @returns True if the user is super-ignored, false otherwise.
   */
  isSuperIgnored(userId: string, superIgnoredUsers: User[]): boolean {
    return superIgnoredUsers.some(user => user.id === userId);
  }

  /**
   * Applies the "Super Ignore" treatment to a post element.
   * @param post The post element to modify.
   * @param superIgnoredUsers The list of super-ignored users.
   */
  applySuperIgnore(post: HTMLElement, superIgnoredUsers: User[]): void {
    const authorId = post.dataset.authorId;
    if (!authorId || !this.isSuperIgnored(authorId, superIgnoredUsers)) {
      return;
    }

    // Replace avatar with a clown emoji
    const avatar = post.querySelector<HTMLElement>('.message-avatar-wrapper');
    if (avatar) {
      avatar.innerHTML = '<span class="clown-emoji">🤡</span>';
    }

    // Change username
    const usernameElement = post.querySelector<HTMLElement>(
      '.message-name .username',
    );
    if (usernameElement) {
      const originalUsername = usernameElement.textContent;
      usernameElement.textContent = `Clown: ${originalUsername}`;
    }

    // Prepend and append text to the post content
    const messageContent = post.querySelector<HTMLElement>(
      '.message-content .bbWrapper',
    );
    if (messageContent) {
      const beforeText = document.createElement('p');
      beforeText.textContent =
        'You should probably ignore this, because I am a clown.';
      const afterText = document.createElement('p');
      afterText.textContent =
        'Finally, ignore most of what I wrote above, because I am an absolute clown.';
      messageContent.prepend(beforeText);
      messageContent.append(afterText);
    }

    // Hide reaction usernames
    const reactionsBar = post.querySelector<HTMLElement>('.reactionsBar-link');
    if (reactionsBar) {
      reactionsBar.textContent = 'A clown was reacted to';
    }

    // Change username in quotes
    const quoteUsername = post.querySelector<HTMLElement>(
      '.bbCodeBlock-sourceJump a.username',
    );
    if (quoteUsername) {
      quoteUsername.textContent = 'A clown said:';
    }
  }
}

export interface User {
  id: string;
  name: string;
}
