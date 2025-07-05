import { MDCTextField } from '@material/textfield';
import { MDCRipple } from '@material/ripple';
import { MDCChipSet } from '@material/chips';

document.addEventListener('DOMContentLoaded', () => {
  const settings = ['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoredKeywords'];

  const createChip = (text: string) => {
    const chipEl = document.createElement('div');
    chipEl.className = 'mdc-evolution-chip';
    chipEl.setAttribute('role', 'row');
    chipEl.innerHTML = `
      <span class="mdc-evolution-chip__cell mdc-evolution-chip__cell--primary" role="gridcell">
        <button class="mdc-evolution-chip__action mdc-evolution-chip__action--primary" type="button" tabindex="0">
          <span class="mdc-evolution-chip__ripple mdc-evolution-chip__ripple--primary"></span>
          <span class="mdc-evolution-chip__text-label">${text}</span>
        </button>
      </span>
      <span class="mdc-evolution-chip__cell mdc-evolution-chip__cell--trailing" role="gridcell">
        <button class="mdc-evolution-chip__action mdc-evolution-chip__action--trailing" type="button" tabindex="-1" data-mdc-deletable="true" aria-label="Remove chip ${text}">
          <span class="mdc-evolution-chip__ripple mdc-evolution-chip__ripple--trailing"></span>
          <span class="mdc-evolution-chip__icon mdc-evolution-chip__icon--trailing">🆇</span>
        </button>
      </span>
    `;
    return chipEl;
  };

  settings.forEach(setting => {
    const input = document.getElementById(`${setting}-input`) as HTMLInputElement;
    const addButton = document.querySelector(`button[data-setting="${setting}"]`) as HTMLElement;
    const chipSetEl = document.getElementById(`${setting}-chips`) as HTMLElement;

    addButton.addEventListener('click', () => {
      if (input.value) {
        const chipEl = createChip(input.value);
        chipSetEl.appendChild(chipEl);
        input.value = '';
      }
    });

    chipSetEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-mdc-deletable="true"]')) {
        const chipEl = target.closest('.mdc-evolution-chip');
        if (chipEl) {
          chipEl.remove();
        }
      }
    });
  });

  const saveButton = document.getElementById('save') as HTMLElement;
  new MDCRipple(saveButton);

  // Load settings from storage and display them
  chrome.storage.sync.get([...settings, 'favoriteRivalsPage'], (result) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    const loadedSettings = result || {};
    settings.forEach(setting => {
      const values = loadedSettings[setting] || [];
      const chipSetEl = document.getElementById(`${setting}-chips`) as HTMLElement;
      values.forEach((value: string) => {
        const chipEl = createChip(value);
        chipSetEl.appendChild(chipEl);
      });
    });
    (document.getElementById('favoriteRivalsPage-input') as HTMLInputElement).value = loadedSettings.favoriteRivalsPage || '';
  });

  saveButton.addEventListener('click', () => {
    const newSettings: { [key: string]: any } = {};
    settings.forEach(setting => {
      const chipSetEl = document.getElementById(`${setting}-chips`) as HTMLElement;
      const chips = Array.from(chipSetEl.querySelectorAll('.mdc-evolution-chip__text-label')).map(el => el.textContent || '').filter(Boolean);
      newSettings[setting] = chips;
    });
    newSettings.favoriteRivalsPage = (document.getElementById('favoriteRivalsPage-input') as HTMLInputElement).value;

    chrome.storage.sync.set(newSettings, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
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