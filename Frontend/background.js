let scrapedProducts = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateProducts") {
        scrapedProducts = request.products;
    } else if (request.action === "getScrapedProducts") {
        sendResponse({ products: scrapedProducts });
    }
});