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

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should set backgroundColor to #efcb3e for reaction count >= 16', () => {
    const post = createMockPost(20);
    colorCodePostsByReactions();
    expect(post.style.backgroundColor).toBe('rgb(239, 203, 62)'); // #efcb3e
  });

  it('should set backgroundColor to #f6dc76 for reaction count >= 10', () => {
    const post = createMockPost(12);
    colorCodePostsByReactions();
    expect(post.style.backgroundColor).toBe('rgb(246, 220, 118)'); // #f6dc76
  });

  it('should set backgroundColor to #faeaab for reaction count >= 5', () => {
    const post = createMockPost(7);
    colorCodePostsByReactions();
    expect(post.style.backgroundColor).toBe('rgb(250, 234, 171)'); // #faeaab
  });

  it('should not set backgroundColor for reaction count < 5', () => {
    const post = createMockPost(3);
    colorCodePostsByReactions();
    expect(post.style.backgroundColor).toBe('');
  });
});

describe('filterPosts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should hide a post by a blocked user', () => {
    const post = document.createElement('article');
    post.className = 'message';
    post.dataset.author = 'blockedUser';
    document.body.appendChild(post);

    const settings = {blockedUsers: ['blockeduser']};
    filterPosts(settings, document);

    expect(post.classList.contains('on3-sanifier-hidden-post')).toBe(true);
  });

  it('should not hide a post by a user in alwaysShowUsers', () => {
    const post = document.createElement('article');
    post.className = 'message';
    post.dataset.author = 'alwaysShowUser';
    document.body.appendChild(post);

    const settings = {
      blockedUsers: ['alwaysshowuser'],
      alwaysShowUsers: ['alwaysshowuser'],
    };
    filterPosts(settings, document);

    expect(post.classList.contains('on3-sanifier-hidden-post')).toBe(false);
  });

  it('should hide a post below the rating threshold', () => {
    const post = document.createElement('article');
    post.className = 'message';
    post.dataset.author = 'someUser';
    post.innerHTML = '<a class="reactionsBar-link">and 2 others</a>';
    document.body.appendChild(post);

    const settings = {ratingThreshold: 5};
    filterPosts(settings, document);

    expect(post.classList.contains('on3-sanifier-hidden-post')).toBe(true);
  });
});

describe('filterThreads', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should hide a thread by its ID', () => {
    const thread = document.createElement('div');
    thread.className = 'structItem--thread';
    thread.dataset.threadListItem = '12345';
    thread.innerHTML =
      '<div class="structItem-title"><a href="#">Thread Title</a></div>';
    document.body.appendChild(thread);

    const settings = {ignoredThreads: ['12345']};
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

  it('should open unread, non-hidden threads in new tabs', () => {
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
