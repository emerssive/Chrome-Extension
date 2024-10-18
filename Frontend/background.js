chrome.action.onClicked.addListener((tab) => {
    // Create and open the popup
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") }, (newTab) => {
        // Wait for the new tab to finish loading
        chrome.tabs.onUpdated.addListener(function onUpdated(tabId, changeInfo) {
            // Check if the new tab is loaded
            if (tabId === newTab.id && changeInfo.status === 'complete') {
                // Execute the scraping script when the tab is fully loaded
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['scraping.js'] // Load the scraping.js script
                }, (result) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                        return; // Exit if there's an error
                    }

                    // Send a message to start scraping after the script is injected
                    chrome.tabs.sendMessage(tabId, { action: "scrapeProductInfo" });
                });

                // Remove the listener to avoid multiple calls
                chrome.tabs.onUpdated.removeListener(onUpdated);
            }
        });
    });
});
