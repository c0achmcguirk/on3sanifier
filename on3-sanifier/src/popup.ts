import { MDCRipple } from '@material/ripple';

document.addEventListener('DOMContentLoaded', () => {
  const optionsButton = document.getElementById('options') as HTMLElement;
  const newPostsButton = document.getElementById('new-posts') as HTMLElement;

  new MDCRipple(optionsButton);
  new MDCRipple(newPostsButton);

  optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  newPostsButton.addEventListener('click', () => {
    chrome.storage.sync.get('favoriteRivalsPage', (settings) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      const result = settings || {};
      const { favoriteRivalsPage = '' } = result;
      if (favoriteRivalsPage) {
        chrome.tabs.create({ url: favoriteRivalsPage });
      } else {
        alert('Please set your favorite Rivals page in the options.');
      }
    });
  });
});
