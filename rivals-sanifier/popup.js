document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  // Load settings from storage and display them
  chrome.storage.sync.get(['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoredKeywords'], (settings) => {
    const { blockedUsers, alwaysShowUsers, ignoredThreads, ignoredKeywords } = settings;

    app.innerHTML = `
      <h2>Blocked Users</h2>
      <textarea id="blockedUsers">${blockedUsers ? blockedUsers.join('\n') : ''}<
/textarea>
      <h2>Always Show Users</h2>
      <textarea id="alwaysShowUsers">${alwaysShowUsers ? alwaysShowUsers.join('\n') : ''}<
/textarea>
      <h2>Ignored Threads (IDs or partial titles)</h2>
      <textarea id="ignoredThreads">${ignoredThreads ? ignoredThreads.join('\n') : ''}<
/textarea>
      <h2>Ignored Keywords</h2>
      <textarea id="ignoredKeywords">${ignoredKeywords ? ignoredKeywords.join('\n') : ''}<
/textarea>
      <br>
      <button id="save">Save</button>
    `;

    document.getElementById('save').addEventListener('click', () => {
      const blockedUsers = document.getElementById('blockedUsers').value.split('\n').filter(Boolean);
      const alwaysShowUsers = document.getElementById('alwaysShowUsers').value.split('\n').filter(Boolean);
      const ignoredThreads = document.getElementById('ignoredThreads').value.split('\n').filter(Boolean);
      const ignoredKeywords = document.getElementById('ignoredKeywords').value.split('\n').filter(Boolean);
      chrome.storage.sync.set({ blockedUsers, alwaysShowUsers, ignoredThreads, ignoredKeywords }, () => {
        alert('Settings saved!');
      });
    });
  });
});
