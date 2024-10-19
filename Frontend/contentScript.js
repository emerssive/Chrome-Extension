function extractProductInfo() {
  const product = {
    name: document.querySelector('h1')?.innerText,
    price: document.querySelector('.price')?.innerText,
    image: document.querySelector('.product-image img')?.src,
    description: document.querySelector('.product-description')?.innerText,
    url: window.location.href
  };

  return product;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractProduct") {
    const product = extractProductInfo();
    sendResponse({product: product});
  }
});
