    let currentTabId = null;
    let popupTabs = {}; // To track store-specific popup tabs

    chrome.action.onClicked.addListener((tab) => {
        console.log("Extension Icon Clicked");
        currentTabId = tab.id;

        // Execute scraping.js in the current tab
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scraping.js']
        }).then(() => {
            console.log("Scraping script executed, waiting for products...");
        }).catch((err) => {
            console.error("Error executing scraping script:", err);
        });
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "saveProducts") {
            const { storeUrl, products } = request;

            // Check if there's already a popup tab for this store
            if (popupTabs[storeUrl]) {
                // If the popup tab already exists, just focus on it
                chrome.tabs.update(popupTabs[storeUrl], { active: true });
            } else {
                // Save products and create a new popup tab if no tab exists
                chrome.storage.local.get([storeUrl], (data) => {
                    const updatedData = data[storeUrl] || [];
                    updatedData.push(...products); // Spread operator to push multiple products

                    // Save updated product data
                    chrome.storage.local.set({ [storeUrl]: updatedData }, () => {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError);
                        } else {
                            console.log(`${products.length} products saved successfully for ${storeUrl}`);
                            console.log(products);

                            const popupUrl = chrome.runtime.getURL("popup.html") + `?storeUrl=${encodeURIComponent(storeUrl)}`;

                            // Create a new popup tab and track it
                            chrome.tabs.create({ url: popupUrl }, (newTab) => {
                                popupTabs[storeUrl] = newTab.id; // Store the tab ID
                            });
                        }
                    });
                });
            }
        }

        // Retrieve products for the specific store URL
        if (request.action === "getScrapedProducts") {
            const { storeUrl } = request;

            chrome.storage.local.get([storeUrl], (data) => {
                sendResponse({ products: data[storeUrl] || [] });
            });
            return true; // Keep the message channel open for async response
        }

        // Clear products for the specific store URL
        if (request.action === "clearProducts") {
            const { storeUrl } = request;

            chrome.storage.local.remove([storeUrl], () => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    sendResponse({ success: false, message: `Error clearing products for ${storeUrl}` });
                } else {
                    console.log(`Products cleared successfully for ${storeUrl}`);
                    sendResponse({ success: true, message: `Products cleared successfully for ${storeUrl}` });

                    // Also remove the popup tab reference after clearing
                    if (popupTabs[storeUrl]) {
                        delete popupTabs[storeUrl]; // Remove the reference from popupTabs
                    }
                }
            });
            return true; // Keep the message channel open for async response
        }

        //saveProduct to backend server
        if (request.action === "saveProduct") {
            const productData = request.product; // Receive the product data directly

            // Make POST request to the server with the product's inner content
            fetch('https://c85b-39-51-52-196.ngrok-free.app/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Structure the body exactly as required
                body: JSON.stringify({
                    image: productData.image_url,
                    name: productData.name,
                    price: productData.price,
                    description: productData.description,
                    rating: productData.rating,
                    reviewCount: productData.review_count,
                    productUrl: productData.product_url,
                    storeUrl: productData.store_url
                })
            })
                .then(response => response.json())
                .then(data => {
                    // Check for successful response by verifying productId
                    if (data.productId) {
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, message: data.message || "Failed to save product." });
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    sendResponse({ success: false });
                });

            return true; // Keep the message channel open for async response
        }

        //deleteProduct
        if (request.action === "deleteProduct") {
            const productId = request.productId;

            // Make DELETE request to the server with the productId
            fetch(`https://c85b-39-51-52-196.ngrok-free.app/products/${productId}`, {
                method: 'DELETE'
            })
                .then(response => {
                    if (response.ok) {
                        return response.json(); // Optionally return a success message or data
                    }
                    throw new Error('Network response was not ok');
                })
                .then(data => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('Error:', error);
                    sendResponse({ success: false });
                });

            return true; // Keep the message channel open for async response
        }


    });
