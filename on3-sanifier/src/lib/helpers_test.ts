import './chrome_mock';
import {
  On3Helpers,
  getReactionCount,
  colorCodePostsByReactions,
  filterPosts,
  filterThreads,
} from './helpers';

describe('getReactionCount', () => {
  it('should return 0 if no reactions bar link is found', () => {
    const post = document.createElement('div');
    expect(getReactionCount(post)).toBe(0);
  });

  it('should return 1 if there is a link but no bdi tags or "others"', () => {
    const post = document.createElement('div');
    post.innerHTML = '<a class="reactionsBar-link">One User</a>';
    expect(getReactionCount(post)).toBe(1);
  });

  it('should return the count of bdi tags', () => {
    const post = document.createElement('div');
    post.innerHTML =
      '<a class="reactionsBar-link"><bdi>User1</bdi>, <bdi>User2</bdi></a>';
    expect(getReactionCount(post)).toBe(2);
  });

  it('should return the count from "and X others"', () => {
    const post = document.createElement('div');
    post.innerHTML = '<a class="reactionsBar-link">and 5 others</a>';
    expect(getReactionCount(post)).toBe(5);
  });

  it('should return the sum of bdi tags and "and X others"', () => {
    const post = document.createElement('div');
    post.innerHTML =
      '<a class="reactionsBar-link"><bdi>User1</bdi>, <bdi>User2</bdi> and 3 others</a>';
    expect(getReactionCount(post)).toBe(5);
  });

  it('should return 0 for an empty reactions bar link', () => {
    const post = document.createElement('div');
    post.innerHTML = '<a class="reactionsBar-link"></a>';
    expect(getReactionCount(post)).toBe(0);
  });
});

describe('colorCodePostsByReactions', () => {
  const createMockPost = (reactionCount: number): HTMLElement => {
    const post = document.createElement('article');
    post.className = 'message';
    const reactionsBar = document.createElement('a');
    reactionsBar.className = 'reactionsBar-link';
    if (reactionCount > 0) {
      if (reactionCount === 1) {
        reactionsBar.innerHTML = 'One User';
      } else {
        reactionsBar.innerHTML = `and ${reactionCount} others`;
      }
    }
    post.appendChild(reactionsBar);
    document.body.appendChild(post);
    return post;
  };

  beforeEach(() => {
    // Mock the entire chrome object for these tests to ensure storage is available.
    (window as any).chrome = {
      runtime: {
        sendMessage: () => {},
        getURL: (path: string) => path,
        getManifest: () => ({
          manifest_version: 3,
          name: 'on3-sanifier',
          version: '1.0.0',
        }),
        openOptionsPage: () => {},
      },
      extension: {
        inIncognitoContext: false,
      },
      storage: {
        sync: {
          get: (keys: any, callback: (items: {[key: string]: any}) => void) => {
            callback({});
          },
          set: (items: any, callback: () => void) => {
            callback();
          },
        },
      },
      tabs: {
        create: () => {},
      },
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should set backgroundColor to #efcb3e for reaction count >= 16', async () => {
    const post = createMockPost(20);
    await colorCodePostsByReactions();
    expect(post.style.backgroundColor).toBe('rgb(239, 203, 62)'); // #efcb3e
  });

  it('should set backgroundColor to #f6dc76 for reaction count >= 10', async () => {
    const post = createMockPost(12);
    await colorCodePostsByReactions();
    expect(post.style.backgroundColor).toBe('rgb(246, 220, 118)'); // #f6dc76
  });

  it('should set backgroundColor to #faeaab for reaction count >= 5', async () => {
    const post = createMockPost(7);
    await colorCodePostsByReactions();
    expect(post.style.backgroundColor).toBe('rgb(250, 234, 171)'); // #faeaab
  });

  it('should not set backgroundColor for reaction count < 5', async () => {
    const post = createMockPost(3);
    await colorCodePostsByReactions();
    expect(post.style.backgroundColor).toBe('');
  });
});

describe('filterPosts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should hide a post by a super ignored user', () => {
    const post = document.createElement('article');
    post.className = 'message';
    post.dataset.author = 'superignoreduser';
    post.dataset.userId = 'superignoreduserid';
    document.body.appendChild(post);

    const settings = {
      superIgnoredUsers: [{id: 'superignoreduserid', name: 'superignoreduser'}],
    };
    const helpers = new On3Helpers();
    filterPosts(settings, document, helpers);

    expect(post.classList.contains('on3-sanifier-hidden-post')).toBe(true);
  });

  it('should not hide a post by a user in alwaysShowUsers', () => {
    const post = document.createElement('article');
    post.className = 'message';
    post.dataset.author = 'alwaysShowUser';
    post.dataset.userId = 'alwaysshowuserid';
    document.body.appendChild(post);

    const settings = {
      superIgnoredUsers: [{id: 'alwaysshowuserid', name: 'alwaysShowUser'}],
      alwaysShowUsers: ['alwaysshowuser'],
    };
    const helpers = new On3Helpers();
    filterPosts(settings, document, helpers);

    expect(post.classList.contains('on3-sanifier-hidden-post')).toBe(false);
  });

  it('should hide a post below the rating threshold', () => {
    const post = document.createElement('article');
    post.className = 'message';
    post.dataset.author = 'someUser';
    post.innerHTML = '<a class="reactionsBar-link">and 2 others</a>';
    document.body.appendChild(post);

    const settings = {ratingThreshold: 5};
    const helpers = new On3Helpers();
    filterPosts(settings, document, helpers);

    expect(post.classList.contains('on3-sanifier-hidden-post')).toBe(true);
  });
});

describe('filterThreads', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should hide a thread by its ID', () => {
    const thread = document.createElement('div');
    thread.className = 'structItem--thread js-threadListItem-12345';
    thread.innerHTML =
      '<div class="structItem-title"><a href="#">Thread Title</a></div>';
    document.body.appendChild(thread);

    const settings = {
      ignoredThreads: [{id: '12345', title: 'Thread Title'}],
      ignoreThreadsContaining: [],
    };
    filterThreads(settings, document);

    expect(thread.classList.contains('on3-sanifier-hidden-thread')).toBe(true);
  });

  it('should hide a thread by a keyword in its title', () => {
    const thread = document.createElement('div');
    thread.className = 'structItem--thread';
    thread.innerHTML =
      '<div class="structItem-title"><a href="#">a thread with a keyword</a></div>';
    document.body.appendChild(thread);

    const settings = {ignoreThreadsContaining: ['keyword']};
    filterThreads(settings, document);

    expect(thread.classList.contains('on3-sanifier-hidden-thread')).toBe(true);
  });
});

describe('On3Helpers', () => {
  it('should be able to be instantiated', () => {
    const helpers = new On3Helpers();
    expect(helpers).toBeDefined();
  });

  describe('detectMode', () => {
    it('should return "inthread" for thread URLs', () => {
      const helpers = new On3Helpers();
      const url = 'https://www.on3.com/boards/threads/some-thread.12345/';
      expect(helpers.detectMode(url)).toBe('inthread');
    });

    it('should return "inforum" for forum URLs', () => {
      const helpers = new On3Helpers();
      const url = 'https://www.on3.com/boards/forums/some-forum.67/';
      expect(helpers.detectMode(url)).toBe('inforum');
    });

    it('should return "inlist" for forum list URLs', () => {
      const helpers = new On3Helpers();
      const url = 'https://www.on3.com/boards/forum/some-forum-list.67/';
      expect(helpers.detectMode(url)).toBe('inlist');
    });

    it('should return undefined for other URLs', () => {
      const helpers = new On3Helpers();
      const url = 'https://www.on3.com/boards/some-other-page/';
      expect(helpers.detectMode(url)).toBeUndefined();
    });
  });

  describe('getThreadTitleFromUrl', () => {
    it('should return the thread title from a URL', () => {
      const helpers = new On3Helpers();
      const url = 'https://www.on3.com/boards/threads/some-thread-title.12345/';
      expect(helpers.getThreadTitleFromUrl(url)).toBe('some thread title');
    });

    it('should return undefined for non-thread URLs', () => {
      const helpers = new On3Helpers();
      const url = 'https://www.on3.com/boards/forums/some-forum.67/';
      expect(helpers.getThreadTitleFromUrl(url)).toBeUndefined();
    });
  });
});

describe('openUnreadThreadsInTabs', () => {
  beforeEach(() => {
    // Mock chrome.runtime.sendMessage
    (window as any).chrome = {
      runtime: {
        sendMessage: () => {},
      },
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should open unread, non-hidden threads in new tabs.', () => {
    spyOn(chrome.runtime, 'sendMessage');
    document.body.innerHTML = `
      <div class="structItem--thread is-unread">
        <div class="structItem-title">
          <a href="/unread-thread-1" data-tp-primary="on"></a>
        </div>
      </div>
      <div class="structItem--thread is-unread on3-sanifier-hidden-thread">
        <div class="structItem-title">
          <a href="/hidden-thread" data-tp-primary="on"></a>
        </div>
      </div>
      <div class="structItem--thread">
        <div class="structItem-title">
          <a href="/read-thread" data-tp-primary="on"></a>
        </div>
      </div>
      <div class="structItem--thread is-unread">
        <div class="structItem-title">
          <a href="/unread-thread-2" data-tp-primary="on"></a>
        </div>
      </div>
    `;

    const helpers = new On3Helpers();
    helpers.openUnreadThreadsInTabs();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'openTab',
      url: 'http://localhost:9876/unread-thread-1',
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'openTab',
      url: 'http://localhost:9876/unread-thread-2',
    });
  });
});
