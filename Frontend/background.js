let currentTabId = null;

chrome.action.onClicked.addListener((tab) => {
    console.log("Extension Icon Clicked");
    currentTabId = tab.id;

    // Execute scraping.js in the current tab
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scraping.js']
    }).then(() => {
        console.log("Scraping script executed, waiting for products...");

        // Listen for message from scraping.js that indicates scraping is done
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "updateProducts") {
                // Store the scraped products
                chrome.storage.local.set({ scrapedProducts: request.products }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                    } else {
                        console.log(`${request.products.length} products saved successfully`);

                        // Now open popup.html after products have been scraped and saved
                        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
                        console.log("Popup created");
                    }
                });
            }
        });
    }).catch((err) => {
        console.error("Error executing scraping script:", err);
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getScrapedProducts") {
        chrome.storage.local.get('scrapedProducts', (data) => {
            sendResponse({ products: data.scrapedProducts || [] });
        });
        return true; // Keep the message channel open for async response
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
