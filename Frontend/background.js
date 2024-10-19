let currentTabId = null;

chrome.action.onClicked.addListener((tab) => {
    currentTabId = tab.id;
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scraping.js']
    }).then(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateProducts") {
        chrome.storage.local.set({ scrapedProducts: request.products }, () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                console.log("Products saved successfully");
            }
        });
    } else if (request.action === "getScrapedProducts") {
        chrome.storage.local.get('scrapedProducts', (data) => {
          sendResponse({ products: data.scrapedProducts || [] });
        });
        return true; 
      } else if (request.action === "clearProducts") {
        chrome.storage.local.remove('scrapedProducts', () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                console.log("Products cleared successfully");
            }
        });
    }
});