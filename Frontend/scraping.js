// Main scraping function
async function scrapeProductInfo() {
    const productDetails = [];
    const maxProducts = 200; // Limit the number of products scraped

    // Expanded selectors for product containers
    const productContainerSelectors = [
        '.s-result-item', // Amazon
        '.product-item', // Generic
        '.item', // Generic
        '.product', // Many e-commerce sites
        '[data-component-type="s-search-result"]', // Amazon (alternative)
        '.grid-product', // Shopify
        '.product-grid-item', // WooCommerce
        '.product-card', // Another common class
        '.product-list-item', // Common for list views
        '.productListItem', // Camel case variation
        '.product-wrapper', // Another common wrapper
        '.catalog-product', // Used in some catalog-style layouts
        '.product-container', // Generic container
        'li.item.product', // Specific nested structure
        'div[data-product-id]', // Products with data attributes
        '.grid__item', // Grid-based layouts
    ];

    // Expanded selectors for product details
    const selectors = {
        image: [
            'img.s-image', 'img.product-image', 'img.product-img', 'img[itemprop="image"]',
            '.product-photo img', '.product-media img', '.product__image',
            'img.primary-image', 'img.main-image', '.product-image-photo',
            'img[data-src]', 'img.lazy-image', '.image img'
        ],
        name: [
            '.a-text-normal', '.product-title', '.product-name', '[itemprop="name"]',
            '.product__title', '.card-title', 'h2.product-name', '.item-title',
            '.product-item-link', '.product-card-title', '.product-info__title',
            '[data-test-id="product-title"]', '.listing-product-title'
        ],
        price: [
            '.a-price-whole', '.price', '.product-price', '[itemprop="price"]',
            '.product__price', '.price-box', '.price--withoutTax',
            '.price--withTax', '[data-price]', '.sales-price',
            '.current-price', '.product-prices', '.price-current'
        ],
        description: [
            '.a-size-base-plus', '.description', '.product-description', '[itemprop="description"]',
            '.product__description', '.product-short-description', '.item-description',
            '.product-info__description', '.product-card__description',
            '[data-test-id="product-description"]', '.listing-product-description'
        ],
        rating: [
            '.a-icon-star-small', '.rating', '.product-rating', '[itemprop="ratingValue"]',
            '.star-rating', '.product-rating-stars', '.rating-stars',
            '[data-rating]', '.product__rating', '.review-rating'
        ],
        reviewCount: [
            '.a-size-base', '.review-count', '[itemprop="reviewCount"]',
            '.rating-count', '.review-number', '.product-rating-count',
            '[data-review-count]', '.product__review-count', '.review-quantity'
        ]
    };

    let productContainers = [];
    productContainerSelectors.forEach(selector => {
        productContainers = productContainers.concat(Array.from(document.querySelectorAll(selector)));
    });

    productContainers = productContainers.slice(0, maxProducts); // Limit the number of products

    await Promise.all(productContainers.map(async (container) => {
        try {
            const details = {
                productId: null,
                image: await extractImageUrl(container, selectors.image),
                name: extractData(container, selectors.name),
                price: extractPrice(extractData(container, selectors.price)),
                description: extractData(container, selectors.description) || await extractMetaDescription(),
                rating: extractRating(container, selectors.rating),
                reviewCount: extractNumber(extractData(container, selectors.reviewCount)),
                productUrl: extractProductUrl(container)
            };

            if (details.name && details.price) {
                productDetails.push(details);
            }
        } catch (error) {
            console.error('Error scraping product:', error);
        }
    }));

    return productDetails;
}

// Extract data using multiple selectors
function extractData(container, selectors) {
    for (let selector of selectors) {
        const element = container.querySelector(selector);
        if (element) {
            return element.innerText.trim();
        }
    }
    return null;
}

// Improved image URL extraction
async function extractImageUrl(container, selectors) {
    for (let selector of selectors) {
        const element = container.querySelector(selector);
        if (element) {
            const src = element.getAttribute('src');
            const dataSrc = element.getAttribute('data-src');
            const lazySrc = element.getAttribute('data-lazy-src');
            const srcset = element.getAttribute('srcset');
            
            const imageUrl = src || dataSrc || lazySrc || (srcset ? srcset.split(',')[0].trim().split(' ')[0] : null);
            if (imageUrl) {
                return await validateImageUrl(imageUrl);
            }
        }
    }
    
    // Fallback: try to find any img tag within the container
    const anyImg = container.querySelector('img');
    if (anyImg) {
        const imageUrl = anyImg.src || anyImg.getAttribute('data-src') || anyImg.getAttribute('data-lazy-src');
        return imageUrl ? await validateImageUrl(imageUrl) : null;
    }
    
    return null;
}

// Validate image URL
async function validateImageUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok ? url : null;
    } catch (error) {
        console.error('Error validating image URL:', error);
        return null;
    }
}

// Extract and parse price
function extractPrice(priceString) {
    if (!priceString) return null;
    const match = priceString.match(/[\d,.]+/);
    return match ? parseFloat(match[0].replace(/[,]/g, '').replace(/\./, '.')) : null;
}

// Extract and parse rating
function extractRating(container, selectors) {
    const ratingText = extractData(container, selectors);
    if (!ratingText) return null;
    const match = ratingText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
}

// Extract and parse numeric values (e.g., review count)
function extractNumber(text) {
    if (!text) return null;
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
}

// Extract meta description as fallback for product description
async function extractMetaDescription() {
    const metaDescription = document.querySelector('meta[name="description"]');
    return metaDescription ? metaDescription.getAttribute('content') : null;
}

// Extract product URL
function extractProductUrl(container) {
    const link = container.querySelector('a[href]');
    return link ? new URL(link.href, window.location.origin).href : null;
}

// Add a delay to prevent overloading the page and allow dynamic content to load
setTimeout(() => {
    // Call scrapeProductInfo
    (async () => {
        const products = await scrapeProductInfo(); // Wait for scraping to complete
        console.log('Scraping completed, fetching current tab URL...');


        const storeUrl = window.location.href;

            console.log('Current store URL:', storeUrl);

            // Send products and storeUrl to background.js once scraping is done
            chrome.runtime.sendMessage({
                action: "saveProducts",
                storeUrl: storeUrl, // Pass the URL as storeUrl
                products: products
            }, () => {
                console.log("Products and store URL sent to background script");
            });

    })();


}, 1000);