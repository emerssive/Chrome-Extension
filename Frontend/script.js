let globalProducts = []; // Global array to store products

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


function initializeApp() {
    initializeFilterSystem();
    loadProducts();
    setupPagination();
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

function loadProducts(page = 1, perPage = 6) {

    const urlParams = new URLSearchParams(window.location.search);
    const storeUrl = urlParams.get('storeUrl');

    chrome.runtime.sendMessage({ action: "getScrapedProducts", storeUrl: storeUrl }, (response) => {
      globalProducts = response.products || [];
      displayProducts(page, perPage);
    });
  }
  
  function displayProducts(page, perPage) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const productsToDisplay = globalProducts.slice(startIndex, endIndex);
  
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
  
    updatePagination(page, Math.ceil(globalProducts.length / perPage));
  }


function setupPagination() {
    const pagination = document.querySelector('.pagination');
    pagination.addEventListener('click', handlePaginationClick);
}

function handlePaginationClick(event) {
    if (event.target.tagName === 'BUTTON') {
        const page = parseInt(event.target.dataset.page);
        if (!isNaN(page)) {
            loadProducts(page);
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
    
    const imageUrl = product.image || 'placeholder.jpg'; // Use a placeholder if no image
    const name = product.name || 'Unknown Product';
    const price = product.price ? `$${product.price.toFixed(2)}` : 'Price not available';
    const description = product.description || 'No description available';

    card.innerHTML = `
        <div class="img-container">
            <img src="${imageUrl}" alt="${name}" onerror="this.src='placeholder.jpg'">
        </div>
        <div class="product-title">
            <p title="${name}">${name}</p>
            <p title="${price}">${price}</p>
        </div>
        <p class="product-body" title="${description}">${description}</p>
        <div class="buttons">
            <button class="registry-button" title="Save to Registry">Save to Registry</button>
            <button class="info-button" title="More Information">More Information</button>
        </div>
    `;
    
    return card;
}