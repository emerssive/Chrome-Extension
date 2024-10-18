let scrapedProducts = []; // Global array to hold scraped product details

// This function will be executed to scrape product information
function scrapeProductInfo() {
    const productDetails = {};
    
    // Define common selectors for different product attributes
    const imageSelectors = ['.image-container img', '.product-image', '.img-product'];
    const nameSelectors = ['.product-title', '.item-name', '.product-name'];
    const priceSelectors = ['.price', '.cost', '.amount'];
    const descriptionSelectors = ['.description', '.details', '.info'];

    // Scrape each product detail using the common selectors
    productDetails.image = extractData(imageSelectors);
    productDetails.name = extractData(nameSelectors);
    productDetails.price = extractData(priceSelectors);
    productDetails.description = extractData(descriptionSelectors);

    // Push scraped product details to the global array
    if (productDetails.name) { // Only push if there is a name
        scrapedProducts.push(productDetails);
    }

    // Log the product details or send it to your storage/DB
    console.log(scrapedProducts);
}

// Generic function to extract data based on an array of selectors
function extractData(selectors) {
    for (let selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            // Return the innerText or image src if the selector targets an image
            return element.tagName.toLowerCase() === 'img' ? element.src : element.innerText.trim();
        }
    }
    return null; // Return null if no matching element is found
}

// Send the scraped products to the popup or wherever needed
function sendScrapedProducts() {
    chrome.runtime.sendMessage({ action: "updateProducts", products: scrapedProducts });
}

// Listen for messages from the background script to trigger scraping
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeProductInfo") {
        scrapeProductInfo();
        sendScrapedProducts(); // Send the updated list of scraped products
        sendResponse({ status: "success" });
    }
});