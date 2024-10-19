let scrapedProducts = [];
let userToken = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateProducts") {
        scrapedProducts = request.products;
    } else if (request.action === "getScrapedProducts") {
        sendResponse({ products: scrapedProducts });
    } else if (request.action === "setToken") {
        userToken = request.token;
        sendResponse({status: "Token set successfully"});
    } else if (request.action === "getToken") {
        sendResponse({token: userToken});
    } else if (request.action === "addToRegistry") {
        addProductToRegistry(request.product, userToken)
            .then(response => sendResponse({status: "success", data: response}))
            .catch(error => sendResponse({status: "error", message: error.message}));
        return true; // Indicates that the response is asynchronous
    }
});

async function addProductToRegistry(product, token) {
    const response = await fetch('https://your-backend-api.com/add-to-registry', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(product)
    });

    if (!response.ok) {
        throw new Error('Failed to add product to registry');
    }

    return await response.json();
}
