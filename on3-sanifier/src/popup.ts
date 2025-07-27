import {MDCRipple} from '@material/ripple';

document.addEventListener('DOMContentLoaded', () => {
  const optionsButton = document.getElementById('options') as HTMLElement;
  const newPostsButton = document.getElementById('new-posts') as HTMLElement;

  new MDCRipple(optionsButton);
  new MDCRipple(newPostsButton);

  const chromeLink = document.getElementById(
    'chrome-link',
  ) as HTMLAnchorElement;
  const firefoxLink = document.getElementById(
    'firefox-link',
  ) as HTMLAnchorElement;

  chromeLink.addEventListener('click', event => {
    event.preventDefault(); // Prevent default link behavior
    void chrome.tabs.create({url: chromeLink.href});
    window.close(); // Close the popup
  });

  firefoxLink.addEventListener('click', event => {
    event.preventDefault(); // Prevent default link behavior
    void chrome.tabs.create({url: firefoxLink.href});
    window.close(); // Close the popup
  });

  optionsButton.addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });

  newPostsButton.addEventListener('click', () => {
    void chrome.storage.sync.get('favoriteRivalsPage', settings => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      const result = settings || {};
      const {favoriteRivalsPage = ''} = result;
      if (favoriteRivalsPage) {
        void chrome.tabs.create({url: favoriteRivalsPage});
      } else {
        alert('Please set your favorite Rivals page in the options.');
      }
    });
  });
});
