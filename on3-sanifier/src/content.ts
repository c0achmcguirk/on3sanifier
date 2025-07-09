import { getReactionCount, colorCodePostsByReactions, filterPosts, filterThreads } from './lib/helpers';
import { MDCRipple } from '@material/ripple';

function createToolbar(): HTMLElement {
  const newDiv = document.createElement('div');
  newDiv.className = 'on3san-toolbar';

  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('o3s_logo_48.png');
  logo.style.height = '24px';
  logo.style.marginRight = '16px';

  // Add a tooltip to the logo
  const manifest = chrome.runtime.getManifest();
  const isFirefox = manifest.browser_specific_settings?.gecko?.id;
  logo.title = isFirefox ?
    'Toolbar from the on3 Sanifier add-on' :
    'Toolbar from the on3 Sanifier extension';

  newDiv.appendChild(logo);

  const showHiddenButton = document.createElement('button');
  showHiddenButton.className = 'mdc-button mdc-button--raised';
  showHiddenButton.innerHTML = '<span class="mdc-button__label">Show hidden</span>';
  new MDCRipple(showHiddenButton);

  showHiddenButton.addEventListener('click', () => {
    document.body.classList.toggle('on3san-show-all');
    const isShowingAll = document.body.classList.contains('on3san-show-all');
    const newText = isShowingAll ? 'Sanify' : 'Show hidden';
    document.querySelectorAll('.on3san-toolbar .mdc-button__label').forEach(buttonLabel => {
      (buttonLabel as HTMLElement).textContent = newText;
    });
  });

  newDiv.appendChild(showHiddenButton);
  return newDiv;
}

function injectCustomDivs(): void {
  // If a toolbar already exists, don't inject another one.
  if (document.querySelector('.on3san-toolbar')) {
    return;
  }

  const targetContainer = document.querySelector('.p-body-content');
  if (targetContainer) {
    const topToolbar = createToolbar();
    const bottomToolbar = createToolbar();
    targetContainer.prepend(topToolbar);
    targetContainer.append(bottomToolbar);
  }
}

// Function to filter posts and threads based on user settings.
function filterContent(): void {
  chrome.storage.sync.get(['blockedUsers', 'alwaysShowUsers', 'ignoredThreads', 'ignoreThreadsContaining', 'ratingThreshold', 'debugMode'], (settings) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    filterPosts(settings, document);
    filterThreads(settings, document);
  });
}

function runSanifier(): void {
  filterContent();
  injectCustomDivs();
  colorCodePostsByReactions();
}

// Run the filter when the page loads.
runSanifier();

// We can use a MutationObserver for this.
const observer = new MutationObserver(runSanifier);
observer.observe(document.body, { childList: true, subtree: true });


