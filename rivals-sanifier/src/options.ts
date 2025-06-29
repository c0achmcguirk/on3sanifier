import { MDCTextField } from '@material/textfield';
import { MDCRipple } from '@material/ripple';
import '@material/textfield/dist/mdc.textfield.css';
import '@material/button/dist/mdc.button.css';
import '@material/floating-label/dist/mdc.floating-label.css';
import '@material/notched-outline/dist/mdc.notched-outline.css';
import '@material/line-ripple/dist/mdc.line-ripple.css';

document.addEventListener('DOMContentLoaded', () => {
  const textFields = Array.from(document.querySelectorAll('.mdc-text-field')).map(el => new MDCTextField(el));
  const saveButton = document.getElementById('save') as HTMLElement;
  new MDCRipple(saveButton);

  // Load settings from storage and display them
  chrome.storage.sync.get(['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoredKeywords', 'favoriteRivalsPage'], (settings) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    const result = settings || {};
    const {
      blockedUsers = [],
      alwaysShowUsers = [],
      ignoredThreads = [],
      ignoredKeywords = [],
      favoriteRivalsPage = ''
    } = result;

    (document.getElementById('blockedUsers') as HTMLTextAreaElement).value = blockedUsers.join('\n');
    (document.getElementById('alwaysShowUsers') as HTMLTextAreaElement).value = alwaysShowUsers.join('\n');
    (document.getElementById('ignoredThreads') as HTMLTextAreaElement).value = ignoredThreads.join('\n');
    (document.getElementById('ignoredKeywords') as HTMLTextAreaElement).value = ignoredKeywords.join('\n');
    (document.getElementById('favoriteRivalsPage') as HTMLInputElement).value = favoriteRivalsPage;
  });

  saveButton.addEventListener('click', () => {
    const blockedUsers = (document.getElementById('blockedUsers') as HTMLTextAreaElement).value.split('\n').filter(Boolean);
    const alwaysShowUsers = (document.getElementById('alwaysShowUsers') as HTMLTextAreaElement).value.split('\n').filter(Boolean);
    const ignoredThreads = (document.getElementById('ignoredThreads') as HTMLTextAreaElement).value.split('\n').filter(Boolean);
    const ignoredKeywords = (document.getElementById('ignoredKeywords') as HTMLTextAreaElement).value.split('\n').filter(Boolean);
    const favoriteRivalsPage = (document.getElementById('favoriteRivalsPage') as HTMLInputElement).value;
    chrome.storage.sync.set({ blockedUsers, alwaysShowUsers, ignoredThreads, ignoredKeywords, favoriteRivalsPage }, () => {
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