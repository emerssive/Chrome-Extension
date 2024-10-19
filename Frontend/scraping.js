let scrapedProducts = [];

function scrapeProductInfo() {
    const productDetails = {};

    // Define common selectors for different product attributes
    const imageSelectors = ['.image-container img', '.product-image', '.img-product'];
    const nameSelectors = ['.product-title', '.item-name', '.product-name'];
    const priceSelectors = ['.price', '.cost', '.amount'];
    const descriptionSelectors = ['.description', '.details', '.info'];

    productDetails.image = extractData(imageSelectors);
    productDetails.name = extractData(nameSelectors);
    productDetails.price = extractData(priceSelectors);
    productDetails.description = extractData(descriptionSelectors);

    if (productDetails.name) {
        scrapedProducts.push(productDetails);
    }

    console.log(scrapedProducts);
    sendScrapedProducts(); // Send products to background script
}

function extractData(selectors) {
    for (let selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            return element.tagName.toLowerCase() === 'img' ? element.src : element.innerText.trim();
        }
    }
    return null; 
}

function sendScrapedProducts() {
    chrome.runtime.sendMessage({ action: "updateProducts", products: scrapedProducts });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeProductInfo") {
        scrapeProductInfo();
        sendResponse({ status: "success" });
    }
});
