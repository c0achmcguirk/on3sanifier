import {MDCSnackbar} from '@material/snackbar';
import {MDCSwitch} from '@material/switch';
import {MDCTopAppBar} from '@material/top-app-bar';
import {MDCTextField} from '@material/textfield';
import {MDCRipple} from '@material/ripple';
import {MDCSlider} from '@material/slider';

interface Settings {
  debugMode: boolean;
  ratingThreshold: number;
  blockedUsers: string[];
  alwaysShowUsers: string[];
  ignoredThreads: string[];
  ignoreThreadsContaining: string[];
  favoriteRivalsPage: string;
}

document.addEventListener('DOMContentLoaded', () => {
  const topAppBarElement = document.querySelector('.mdc-top-app-bar');
  if (topAppBarElement) {
    new MDCTopAppBar(topAppBarElement);
  }

  const settings = [
    'blockedUsers',
    'alwaysShowUsers',
    'ignoredThreads',
    'ignoreThreadsContaining',
    'ratingThreshold',
  ];

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
    const input = document.getElementById(
      `${setting}-input`,
    ) as HTMLInputElement;
    const addButton = document.querySelector(
      `button[data-setting="${setting}"]`,
    ) as HTMLElement;
    const chipSetEl = document.getElementById(
      `${setting}-chips`,
    ) as HTMLElement;

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addButton.click();
      }
    });

    addButton.addEventListener('click', () => {
      if (input.value) {
        const chipEl = createChip(input.value);
        chipSetEl
          .querySelector('.mdc-evolution-chip-set__chips')
          ?.appendChild(chipEl);
        input.value = '';
      }
    });

    chipSetEl.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-mdc-deletable="true"]')) {
        const chipEl = target.closest('.mdc-evolution-chip');
        if (chipEl) {
          chipEl.remove();
        }
      }
    });
  });

  const ratingThresholdSliderElement =
    document.getElementById('ratingThreshold');
  const ratingValue = document.getElementById('ratingValue') as HTMLElement;
  let ratingThresholdSlider: MDCSlider | undefined;
  if (ratingThresholdSliderElement) {
    ratingThresholdSlider = new MDCSlider(ratingThresholdSliderElement);
    ratingThresholdSlider.listen('MDCSlider:input', () => {
      ratingValue.textContent =
        ratingThresholdSlider?.getValue().toString() || '0';
    });
  }

  const debugModeSwitchElement = document.querySelector('.mdc-switch');
  let debugModeSwitch: MDCSwitch | undefined;
  if (debugModeSwitchElement) {
    debugModeSwitch = new MDCSwitch(debugModeSwitchElement);
  }

  // Load settings from storage and display them
  chrome.storage.sync.get(
    [...settings, 'favoriteRivalsPage', 'debugMode'],
    result => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      const loadedSettings = result || {};
      if (debugModeSwitch) {
        debugModeSwitch.selected = loadedSettings.debugMode || false;
      }
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
        const chipSetEl = document.getElementById(
          `${setting}-chips`,
        ) as HTMLElement;
        values.forEach((value: string) => {
          const chipEl = createChip(value);
          chipSetEl
            .querySelector('.mdc-evolution-chip-set__chips')
            ?.appendChild(chipEl);
        });
      });
      (
        document.getElementById('favoriteRivalsPage-input') as HTMLInputElement
      ).value = loadedSettings.favoriteRivalsPage || '';
    },
  );

  const snackbarElement = document.querySelector('.mdc-snackbar');
  let snackbar: MDCSnackbar | undefined;
  if (snackbarElement) {
    snackbar = new MDCSnackbar(snackbarElement);
  }

  const copySettingsButton = document.getElementById(
    'copy-settings',
  ) as HTMLElement;
  const importFromClipboardButton = document.getElementById(
    'import-from-clipboard',
  ) as HTMLElement;
  const importSettingsTextarea = document.getElementById(
    'import-settings-textarea',
  ) as HTMLTextAreaElement;
  new MDCTextField(
    document.getElementById('import-settings-container') as HTMLElement,
  );
  const saveImportedSettingsButton = document.getElementById(
    'save-imported-settings',
  ) as HTMLElement;

  const getAllSettingsFromUI = (): Partial<Settings> => {
    const newSettings: Partial<Settings> = {};
    newSettings.debugMode = debugModeSwitch?.selected || false;
    settings.forEach(setting => {
      if (setting === 'ratingThreshold') {
        newSettings[setting] = ratingThresholdSlider?.getValue() || 0;
        return;
      }
      const chipSetEl = document.getElementById(
        `${setting}-chips`,
      ) as HTMLElement;
      const chips = Array.from(
        chipSetEl.querySelectorAll('.mdc-evolution-chip__text-label'),
      )
        .map(el => el.textContent || '')
        .filter(Boolean);
      newSettings[setting as keyof Settings] = chips;
    });
    newSettings.favoriteRivalsPage = (
      document.getElementById('favoriteRivalsPage-input') as HTMLInputElement
    ).value;
    return newSettings;
  };

  const updateUiWithOptions = (newSettings: Partial<Settings>) => {
    if (debugModeSwitch) {
      debugModeSwitch.selected = newSettings.debugMode || false;
    }
    if (ratingThresholdSlider) {
      ratingThresholdSlider.setValue(newSettings.ratingThreshold || 0);
    }
    (document.getElementById('ratingValue') as HTMLElement).textContent = (
      newSettings.ratingThreshold || 0
    ).toString();

    const chipSettings = [
      'blockedUsers',
      'alwaysShowUsers',
      'ignoredThreads',
      'ignoreThreadsContaining',
    ];
    chipSettings.forEach(settingKey => {
      const chipSetEl = document.getElementById(`${settingKey}-chips`);
      const chipsContainer = chipSetEl?.querySelector(
        '.mdc-evolution-chip-set__chips',
      );
      if (chipsContainer) {
        chipsContainer.innerHTML = ''; // Clear existing chips
        const values =
          (newSettings[settingKey as keyof Settings] as string[]) || [];
        values.forEach(value => {
          const chipEl = createChip(value);
          chipsContainer.appendChild(chipEl);
        });
      }
    });

    (
      document.getElementById('favoriteRivalsPage-input') as HTMLInputElement
    ).value = newSettings.favoriteRivalsPage || '';
  };

  copySettingsButton?.addEventListener('click', () => {
    const settingsToCopy = getAllSettingsFromUI();
    const settingsString = JSON.stringify(settingsToCopy, null, 2);
    void navigator.clipboard.writeText(settingsString).then(() => {
      if (snackbar) {
        snackbar.labelText = 'Settings copied to clipboard!';
        snackbar.open();
      }
    });
  });

  importFromClipboardButton?.addEventListener('click', () => {
    void navigator.clipboard.readText().then(text => {
      importSettingsTextarea.value = text;
    });
  });

  saveImportedSettingsButton?.addEventListener('click', () => {
    const settingsString = importSettingsTextarea.value;
    if (!settingsString) return;

    try {
      const importedSettings = JSON.parse(settingsString) as Partial<Settings>;

      // Basic validation
      if (typeof importedSettings !== 'object' || importedSettings === null) {
        throw new Error('Imported data is not a valid object.');
      }

      // More specific validation can be added here if needed.
      const expectedKeys = [
        'debugMode',
        'ratingThreshold',
        'blockedUsers',
        'alwaysShowUsers',
        'ignoredThreads',
        'ignoreThreadsContaining',
        'favoriteRivalsPage',
      ];
      for (const key of expectedKeys) {
        if (!(key in importedSettings)) {
          throw new Error(`Missing required setting: ${key}`);
        }
      }

      updateUiWithOptions(importedSettings);
      saveSettings(); // This will also show the snackbar
    } catch (e: any) {
      if (snackbar) {
        snackbar.labelText = `Invalid settings format: ${e.message as string}`;
        snackbar.open();
      }
    }
  });

  const saveSettings = () => {
    const newSettings = getAllSettingsFromUI();

    chrome.storage.sync.set(newSettings, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        if (snackbar) {
          snackbar.labelText = 'Error saving settings.';
          snackbar.open();
        }
        return;
      }
      if (snackbar) {
        snackbar.labelText = 'Settings saved!';
        snackbar.open();
      }
    });
  };

  if (ratingThresholdSlider) {
    ratingThresholdSlider.listen('MDCSlider:change', saveSettings);
  }
  if (debugModeSwitch) {
    debugModeSwitch.listen('change', saveSettings);
  }
  document
    .getElementById('favoriteRivalsPage-input')
    ?.addEventListener('change', saveSettings);

  settings.forEach(setting => {
    if (setting === 'ratingThreshold') return;
    const chipSetEl = document.getElementById(
      `${setting}-chips`,
    ) as HTMLElement;
    chipSetEl.addEventListener('MDCChip:removal', saveSettings);
    const addButton = document.querySelector(
      `button[data-setting="${setting}"]`,
    ) as HTMLElement;
    addButton.addEventListener('click', saveSettings);
  });

  // Initialize all inputs.
  const textFieldElements = document.querySelectorAll('.mdc-text-field');
  for (const domElement of textFieldElements) {
    new MDCTextField(domElement);
  }
});
