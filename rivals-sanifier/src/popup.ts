document.addEventListener('DOMContentLoaded', () => {
  (document.getElementById('options') as HTMLElement).addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  (document.getElementById('new-posts') as HTMLElement).addEventListener('click', () => {
    // We'll implement this later
    alert('This will take you to your favorite Rivals posts page.');
  });
});
