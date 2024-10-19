function scrapeProductInfo() {
    const productDetails = [];

    // Define common selectors for different product attributes
    const productSelectors = [
        '.s-result-item', // Amazon
        '.product-item', // Generic
        '.item' // Generic
    ];

    const imageSelectors = ['.s-image', '.product-image', '.img-product'];
    const nameSelectors = ['.a-text-normal', '.product-title', '.item-name'];
    const priceSelectors = ['.a-price-whole', '.price', '.cost'];
    const descriptionSelectors = ['.a-size-base-plus', '.description', '.details'];

    let products = [];
    productSelectors.forEach(selector => {
        products = products.concat(Array.from(document.querySelectorAll(selector)));
    });

    products.forEach(product => {
        const details = {};
        details.image = extractData(product, imageSelectors, 'src');
        details.name = extractData(product, nameSelectors);
        details.price = extractData(product, priceSelectors);
        details.description = extractData(product, descriptionSelectors);

        if (details.name) {
            productDetails.push(details);
        }
    });

    chrome.runtime.sendMessage({ action: "updateProducts", products: productDetails });
}

function extractData(product, selectors, attribute) {
    for (let selector of selectors) {
        const element = product.querySelector(selector);
        if (element) {
            return attribute ? element.getAttribute(attribute) : element.innerText.trim();
        }
    }
    return null;
}

scrapeProductInfo();