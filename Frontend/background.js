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
                const { storeUrl, products } = request;

                chrome.storage.local.get([storeUrl], (data) => {

                    const updatedData = data[storeUrl] || [];
                    updatedData.push(...products); // Add new products to existing ones

                    chrome.storage.local.set({ [storeUrl]: updatedData }, () => {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError);
                        } else {

                            console.log(`${products.length} products saved successfully for ${storeUrl}`);
                            const popupUrl = chrome.runtime.getURL("popup.html") + `?storeUrl=${encodeURIComponent(storeUrl)}`;
                            chrome.tabs.create({ url: popupUrl });
                        }
                    });
                });
            }
        });
    }).catch((err) => {
        console.error("Error executing scraping script:", err);
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getScrapedProducts") {
        const { storeUrl } = request;

        // Retrieve products for the specific store URL
        chrome.storage.local.get([storeUrl], (data) => {
            sendResponse({ products: data[storeUrl] || [] });
        });
        return true; // Keep the message channel open for async response
    }
    else if (request.action === "clearProducts") {
        const {storeUrl} = request;

        // Clear products for the specific store URL
        chrome.storage.local.remove([storeUrl], () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                // Optionally send a response to indicate failure
                sendResponse({success: false, message: `Error clearing products for ${storeUrl}`});
            } else {
                console.log(`Products cleared successfully for ${storeUrl}`);
                // Optionally send a response to indicate success
                sendResponse({success: true, message: `Products cleared successfully for ${storeUrl}`});
            }
        });
        return true;
    }
    });
