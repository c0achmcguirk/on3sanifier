import { MDCTextField } from '@material/textfield';
import { MDCRipple } from '@material/ripple';
import { MDCChipSet } from '@material/chips';

document.addEventListener('DOMContentLoaded', () => {
  const settings = ['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoredKeywords'];

  settings.forEach(setting => {
    const input = document.getElementById(`${setting}-input`) as HTMLInputElement;
    const addButton = document.querySelector(`button[data-setting="${setting}"]`) as HTMLElement;
    const chipSetEl = document.getElementById(`${setting}-chips`) as HTMLElement;
    const chipSet = new MDCChipSet(chipSetEl);

    const addChip = (text: string) => {
      const chipEl = document.createElement('div');
      chipEl.className = 'mdc-chip';
      chipEl.innerHTML = `
        <div class="mdc-chip__ripple"></div>
        <span role="gridcell">
          <span role="button" tabindex="0" class="mdc-chip__primary-action">
            <span class="mdc-chip__text">${text}</span>
          </span>
          <span role="gridcell">
            <i class="material-icons mdc-chip__icon mdc-chip__icon--trailing" tabindex="-1" role="button">cancel</i>
          </span>
        </span>
      `;
      chipSetEl.appendChild(chipEl);
      chipSet.addChip(chipEl);
    };

    addButton.addEventListener('click', () => {
      if (input.value) {
        addChip(input.value);
        input.value = '';
      }
    });

    chipSetEl.addEventListener('MDCChip:removal', (event: any) => {
      chipSet.removeChip(event.detail.chipId);
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
      values.forEach((value: string) => {
        const chipSetEl = document.getElementById(`${setting}-chips`) as HTMLElement;
        const chipSet = new MDCChipSet(chipSetEl);
        const chipEl = document.createElement('div');
        chipEl.className = 'mdc-chip';
        chipEl.innerHTML = `
          <div class="mdc-chip__ripple"></div>
          <span role="gridcell">
            <span role="button" tabindex="0" class="mdc-chip__primary-action">
              <span class="mdc-chip__text">${value}</span>
            </span>
            <span role="gridcell">
              <i class="material-icons mdc-chip__icon mdc-chip__icon--trailing" tabindex="-1" role="button">cancel</i>
            </span>
          </span>
        `;
        chipSetEl.appendChild(chipEl);
        chipSet.addChip(chipEl);
      });
    });
    (document.getElementById('favoriteRivalsPage-input') as HTMLInputElement).value = loadedSettings.favoriteRivalsPage || '';
  });

  saveButton.addEventListener('click', () => {
    const newSettings: { [key: string]: any } = {};
    settings.forEach(setting => {
      const chipSetEl = document.getElementById(`${setting}-chips`) as HTMLElement;
      const chipSet = new MDCChipSet(chipSetEl);
      newSettings[setting] = chipSet.chips.map(chip => chip.root.querySelector('.mdc-chip__text')?.textContent || '').filter(Boolean);
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