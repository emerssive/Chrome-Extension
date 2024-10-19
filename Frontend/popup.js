document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const productContainer = document.getElementById('product-container');
  const loginBtn = document.getElementById('login-btn');
  const addToRegistryBtn = document.getElementById('add-to-registry-btn');
  const messageDiv = document.getElementById('message');

  loginBtn.addEventListener('click', login);
  addToRegistryBtn.addEventListener('click', addToRegistry);

  chrome.storage.local.get(['token'], (result) => {
    if (result.token) {
      showProductInfo();
    }
  });

  async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('https://your-backend-api.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      chrome.storage.local.set({ token: data.token });
      chrome.runtime.sendMessage({ action: "setToken", token: data.token });
      showProductInfo();
    } catch (error) {
      messageDiv.textContent = error.message;
    }
  }

  function showProductInfo() {
    loginContainer.style.display = 'none';
    productContainer.style.display = 'block';

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractProduct"}, (response) => {
        if (response && response.product) {
          const productInfoDiv = document.getElementById('product-info');
          productInfoDiv.innerHTML = `
            <p>Name: ${response.product.name}</p>
            <p>Price: ${response.product.price}</p>
            <img src="${response.product.image}" alt="Product Image" style="max-width: 100px;">
          `;
        }
      });
    });
  }

  async function addToRegistry() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractProduct"}, async (response) => {
        if (response && response.product) {
          try {
            const result = await chrome.runtime.sendMessage({
              action: "addToRegistry",
              product: response.product
            });
            if (result.status === "success") {
              messageDiv.textContent = "Product added to registry successfully!";
            } else {
              throw new Error(result.message);
            }
          } catch (error) {
            messageDiv.textContent = `Failed to add product: ${error.message}`;
          }
        }
      });
    });
  }
});
