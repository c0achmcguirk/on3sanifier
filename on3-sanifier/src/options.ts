import { MDCTopAppBar } from '@material/top-app-bar';
import { MDCTextField } from '@material/textfield';
import { MDCRipple } from '@material/ripple';
import { MDCChipSet } from '@material/chips';
import { MDCSlider } from '@material/slider';

document.addEventListener('DOMContentLoaded', () => {
  const topAppBarElement = document.querySelector('.mdc-top-app-bar');
  if (topAppBarElement) {
    const topAppBar = new MDCTopAppBar(topAppBarElement);
  }

  const settings = ['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoreThreadsContaining', 'ratingThreshold'];

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
        <button class="mdc-evolution-chip__action mdc-evolution-chip__action--trailing on3san-chip-delicon"
          type="button" tabindex="-1" data-mdc-deletable="true" aria-label="Remove chip ${text}">
          <span class="mdc-evolution-chip__ripple mdc-evolution-chip__ripple--trailing"></span>
          <span class="mdc-evolution-chip__icon mdc-evolution-chip__icon--trailing">🆇</span>
        </button>
      </span>
    `;
    return chipEl;
  };

  settings.forEach(setting => {
    if (setting === 'ratingThreshold') return;
    const input = document.getElementById(`${setting}-input`) as HTMLInputElement;
    const addButton = document.querySelector(`button[data-setting="${setting}"]`) as HTMLElement;
    const chipSetEl = document.getElementById(`${setting}-chips`) as HTMLElement;

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addButton.click();
      }
    });

    addButton.addEventListener('click', () => {
      if (input.value) {
        const chipEl = createChip(input.value);
        chipSetEl.querySelector('.mdc-evolution-chip-set__chips')?.appendChild(chipEl);
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

  const ratingThresholdSliderElement = document.getElementById('ratingThreshold');
  const ratingValue = document.getElementById('ratingValue') as HTMLElement;
  let ratingThresholdSlider: MDCSlider | undefined;
  if (ratingThresholdSliderElement) {
    ratingThresholdSlider = new MDCSlider(ratingThresholdSliderElement);
    ratingThresholdSlider.listen('MDCSlider:input', () => {
      ratingValue.textContent = ratingThresholdSlider?.getValue().toString() || '0';
    });
  }


  // Load settings from storage and display them
  chrome.storage.sync.get([...settings, 'favoriteRivalsPage'], (result) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    const loadedSettings = result || {};
    settings.forEach(setting => {
      if (setting === 'ratingThreshold') {
        const value = loadedSettings[setting] || 0;
        if (ratingThresholdSlider) {
          ratingThresholdSlider.setValue(value);
        }
        ratingValue.textContent = value.toString();
        return;
      }
      const values = loadedSettings[setting] || [];
      const chipSetEl = document.getElementById(`${setting}-chips`) as HTMLElement;
      values.forEach((value: string) => {
        const chipEl = createChip(value);
        chipSetEl.querySelector('.mdc-evolution-chip-set__chips')?.appendChild(chipEl);
      });
    });
    (document.getElementById('favoriteRivalsPage-input') as HTMLInputElement).value = loadedSettings.favoriteRivalsPage || '';
  });

  saveButton.addEventListener('click', () => {
    const newSettings: { [key: string]: any } = {};
    settings.forEach(setting => {
      if (setting === 'ratingThreshold') {
        newSettings[setting] = ratingThresholdSlider?.getValue() || 0;
        return;
      }
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

  // Initialize all inputs.
  const textFieldElements = document.querySelectorAll('.mdc-text-field');
  for (const domElement of textFieldElements) {
    new MDCTextField(domElement);
  }
});