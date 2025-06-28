document.addEventListener('DOMContentLoaded', () => {
  // Load settings from storage and display them
  chrome.storage.sync.get(['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoredKeywords'], (settings) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    const result = settings || {};
    const {
      blockedUsers = [],
      alwaysShowUsers = [],
      ignoredThreads = [],
      ignoredKeywords = []
    } = result;

    (document.getElementById('blockedUsers') as HTMLTextAreaElement).value = blockedUsers.join('\n');
    (document.getElementById('alwaysShowUsers') as HTMLTextAreaElement).value = alwaysShowUsers.join('\n');
    (document.getElementById('ignoredThreads') as HTMLTextAreaElement).value = ignoredThreads.join('\n');
    (document.getElementById('ignoredKeywords') as HTMLTextAreaElement).value = ignoredKeywords.join('\n');
  });

  (document.getElementById('save') as HTMLElement).addEventListener('click', () => {
    const blockedUsers = (document.getElementById('blockedUsers') as HTMLTextAreaElement).value.split('\n').filter(Boolean);
    const alwaysShowUsers = (document.getElementById('alwaysShowUsers') as HTMLTextAreaElement).value.split('\n').filter(Boolean);
    const ignoredThreads = (document.getElementById('ignoredThreads') as HTMLTextAreaElement).value.split('\n').filter(Boolean);
    const ignoredKeywords = (document.getElementById('ignoredKeywords') as HTMLTextAreaElement).value.split('\n').filter(Boolean);
    chrome.storage.sync.set({ blockedUsers, alwaysShowUsers, ignoredThreads, ignoredKeywords }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        // Optionally, show an error toast to the user
        return;
      }
      const toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'show';
      toast.textContent = 'Settings saved!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    });
  });
});