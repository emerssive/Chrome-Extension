let globalProducts = []; // Global array to store products
let defaultGlobalProducts = []; // Backup for default products

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('beforeunload', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const storeUrl = urlParams.get('storeUrl');

    console.log("Tab or window is about to be closed, clearing products for:", storeUrl);

    chrome.runtime.sendMessage({
        action: "clearProducts",
        storeUrl: storeUrl
    }, (response) => {
        console.log("clearProducts message sent to background script");
        // Log the result but do not block the tab closure
        if (response && response.success) {
            console.log(`Successfully cleared products for ${storeUrl}.`);
        } else {
            console.error(`Failed to clear products for ${storeUrl}.`);
        }
    });
});

// Toggle dropdown menu on user icon click
document.getElementById('user-icon').addEventListener('click', () => {
    const dropdownMenu = document.getElementById('dropdown-menu');
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

// "See Your Registry" option
document.getElementById('registry-option').addEventListener('click', () => {
    // Store current globalProducts in defaultGlobalProducts if not already set
    if (defaultGlobalProducts.length === 0) {
        defaultGlobalProducts = [...globalProducts];
    }
    // Fetch registry products
    chrome.runtime.sendMessage({ action: "getRegistryProducts" }, (response) => {
        if (response && response.products) {
            globalProducts = response.products; // Set registry products
            displayProducts(1, 6); // Update product display
        }
    });
    document.getElementById('dropdown-menu').style.display = 'none';
});

// "Home" option
document.getElementById('home-option').addEventListener('click', () => {
    globalProducts = defaultGlobalProducts; // Reset to default products
    defaultGlobalProducts = []; // Clear backup
    displayProducts(1, 6); // Update product display
    document.getElementById('dropdown-menu').style.display = 'none';
});


function initializeApp() {
    initializeFilterSystem();
    loadProducts();
    setupPagination();
    setupModal();

    const searchInput = document.querySelector('.search-bar input[type="text"]');
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        displayProducts(1, 6, searchTerm); // Reset to first page
    });




}

function initializeFilterSystem() {
    const filterContent = document.querySelector('.filter-content');
    const filterTags = document.querySelector('.filter-tags');
    const checkboxes = filterContent.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

function handleCheckboxChange(event) {
    const checkbox = event.target;
    const value = checkbox.value;
    const text = checkbox.parentElement.textContent.trim();

    if (checkbox.checked) {
        addFilterTag(value, text);
    } else {
        removeFilterTag(value);
    }
}

function addFilterTag(value, text) {
    const filterTags = document.querySelector('.filter-tags');
    const tag = createFilterTag(value, text);
    filterTags.appendChild(tag);
}

function createFilterTag(value, text) {
    const tag = document.createElement('span');
    tag.classList.add('filter-tag');
    tag.dataset.value = value;
    tag.innerHTML = `${text} <span class="remove">×</span>`;
    tag.querySelector('.remove').addEventListener('click', () => handleRemoveTag(value));
    return tag;
}

function handleRemoveTag(value) {
    removeFilterTag(value);
    uncheckCorrespondingCheckbox(value);
}

function removeFilterTag(value) {
    const filterTags = document.querySelector('.filter-tags');
    const tag = filterTags.querySelector(`.filter-tag[data-value="${value}"]`);
    if (tag) tag.remove();
}

function uncheckCorrespondingCheckbox(value) {
    const filterContent = document.querySelector('.filter-content');
    const checkbox = filterContent.querySelector(`input[value="${value}"]`);
    if (checkbox) checkbox.checked = false;
}

function loadProducts(page = 1, perPage = 6,  searchTerm = '') {

    const urlParams = new URLSearchParams(window.location.search);
    const storeUrl = urlParams.get('storeUrl');

    chrome.runtime.sendMessage({ action: "getScrapedProducts", storeUrl: storeUrl }, (response) => {
      globalProducts = response.products || [];
      displayProducts(page, perPage, searchTerm);
    });
  }

function displayProducts(page, perPage, searchTerm) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const filteredProducts = globalProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm)
    );
    const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

    const productContainer = document.getElementById('product-container');
    productContainer.innerHTML = ''; // Clear existing products

    // Create rows and populate with product cards
    for (let i = 0; i < productsToDisplay.length; i += 3) {
        const row = document.createElement('div');
        row.classList.add('row-1');

        for (let j = i; j < i + 3 && j < productsToDisplay.length; j++) {
            const productCard = createProductCard(productsToDisplay[j]);
            row.appendChild(productCard);
        }

        productContainer.appendChild(row);
    }

    updatePagination(page, Math.ceil(filteredProducts.length / perPage));
}

function setupPagination() {
    const pagination = document.querySelector('.pagination');
    pagination.addEventListener('click', handlePaginationClick);
}

function handlePaginationClick(event) {
    if (event.target.tagName === 'BUTTON') {
        const page = parseInt(event.target.dataset.page);
        if (!isNaN(page)) {
            const searchInput = document.querySelector('.search-bar input[type="text"]');
            const searchTerm = searchInput.value.toLowerCase(); // Get the current search term
            loadProducts(page, 6, searchTerm); // Pass the search term
        }
    }
}

function updatePagination(currentPage, totalPages) {
    const pagination = document.querySelector('.pagination');
    pagination.innerHTML = '';

    const createButton = (text, page, isDisabled = false) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.dataset.page = page;
        button.disabled = isDisabled;
        return button;
    };

    pagination.appendChild(createButton('<', currentPage - 1, currentPage === 1));

    const pageRange = getPageRange(currentPage, totalPages);
    pageRange.forEach(i => {
        if (i === '...') {
            const span = document.createElement('span');
            span.textContent = '...';
            pagination.appendChild(span);
        } else {
            const button = createButton(i, i);
            if (i === currentPage) button.classList.add('active');
            pagination.appendChild(button);
        }
    });

    pagination.appendChild(createButton('>', currentPage + 1, currentPage === totalPages));
}

function getPageRange(currentPage, totalPages) {
    const range = [];
    const delta = 2;
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    let l;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= left && i < right)) {
            range.push(i);
        } else if (i < left) {
            i = left - 1;
            range.push('...');
        } else if (i >= right) {
            range.push('...');
            i = totalPages - 1;
        }
    }

    return range;
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-card');
    
    const image_url = product.image || 'placeholder.jpg'; // Use a placeholder if no image
    const name = product.name || 'Unknown Product';
    const price = product.price ? product.price.toFixed(2) : 'Price not available';
    const description = product.description || 'No description available';
    const rating = product.rating;
    const review_count = product.reviewCount;
    const product_url = product.productUrl;
    const urlParams = new URLSearchParams(window.location.search);
    const store_url = urlParams.get('storeUrl');

    card.innerHTML = `
        <div class="img-container">
            <img src="${image_url}" alt="${name}" onerror="this.src='placeholder.jpg'">
        </div>
        <div class="product-title">
            <p title="${name}">${name}</p>
            <p title="${price}">$${price}</p>
        </div>
        <p class="product-body" title="${description}">${description}</p>
        <div class="buttons">
            <button class="registry-button" title="Save to Registry">Save to Registry</button>
            <button class="info-button" title="More Information">More Information</button>
        </div>
    `;

    card.querySelector('.registry-button').addEventListener('click', () => {
        const saveButton = card.querySelector('.registry-button');

        // Check if the button is already in "Delete from Registry" mode
        if (saveButton.textContent === 'Delete from Registry') {
            // Send delete request
            chrome.runtime.sendMessage({ action: "deleteProduct", productId: product.productId }, (response) => {
                if (response && response.success) {
                    product.productId = null; // Clear productId on deletion
                    saveButton.innerHTML = '✔ Deleted';

                    setTimeout(() => {
                        saveButton.innerHTML = 'Save to Registry';
                    }, 2000); // Show for 1 second

                } else {
                    console.error('Error deleting product');
                }
            });
        }
        else {
            // Show loading spinner
            const loadingSpinner = document.createElement('span');
            loadingSpinner.classList.add('spinner');
            saveButton.innerHTML = ''; // Clear existing content
            saveButton.appendChild(loadingSpinner); // Show spinner

            // Prepare product data and store URL
            const productData = {
                name,
                price,
                description,
                image_url,
                rating,
                review_count,
                product_url,
                store_url
            };

            // Send message to background.js
            chrome.runtime.sendMessage({ action: "saveProduct", product: productData }, (response) => {
                if (response && response.success) {
                    product.productId = response.productId; // Save productId for deletion
                    saveButton.innerHTML = '✔ Saved'; // Show checkmark and text

                    // Change button text to "Delete from Registry" after a brief moment
                    setTimeout(() => {
                        saveButton.innerHTML = 'Delete from Registry';
                    }, 2000); // Show for 1 second
                } else {
                    saveButton.innerHTML = 'Error'; // Handle error
                }
            });

        }
    });

    card.querySelector('.info-button').addEventListener('click', () => {
        showProductInfo(product); // Call to show product information
    });


    return card;
}

function setupModal() {
    const modal = document.getElementById('product-modal');
    const closeButton = document.querySelector('.close-button');

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function showProductInfo(product) {
    document.getElementById('modal-product-name').innerText = product.name;
    document.getElementById('modal-product-image').src = product.image || 'placeholder.jpg';
    document.getElementById('modal-product-description').innerText = product.description || 'No description available';
    document.getElementById('modal-product-price').innerText = `Price: $${product.price.toFixed(2)}`;
    document.getElementById('modal-product-rating').innerText = `Rating: ${product.rating || 'N/A'}`;
    document.getElementById('modal-product-review-count').innerText = `Reviews: ${product.reviewCount || 0}`;

    const modal = document.getElementById('product-modal');
    modal.style.display = 'block';
}
