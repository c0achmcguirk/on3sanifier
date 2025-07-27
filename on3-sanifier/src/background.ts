chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openTab') {
    if (request.url) {
      void chrome.tabs.create({url: request.url});
    }
  }
});

chrome.commands.onCommand.addListener(command => {
  if (command === 'toggle-hidden') {
    void chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      if (tabs[0]?.id) {
        void chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleHidden'});
      }
    });
  }
});
