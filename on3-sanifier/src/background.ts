chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openTab') {
    if (request.url) {
      void chrome.tabs.create({url: request.url});
    }
  }
});
