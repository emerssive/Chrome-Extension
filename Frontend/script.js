let globalProducts = []; // Global array to store products

document.addEventListener('DOMContentLoaded', initializeApp);

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
    // This function would typically fetch products from an API
    // For this example, we'll use dummy data
    const dummyProducts = [
        { name: "Product 1", price: "FREE", description: "Description for Product 1" },
        { name: "Product 2", price: "$9.99", description: "Description for Product 2" },
        { name: "Product 3", price: "FREE", description: "Description for Product 3" },
        { name: "Product 4", price: "$19.99", description: "Description for Product 4" },
        { name: "Product 5", price: "FREE", description: "Description for Product 5" },
        { name: "Product 6", price: "$29.99", description: "Description for Product 6" },
        { name: "Product 7", price: "FREE", description: "Description for Product 7" },
        { name: "Product 8", price: "$39.99", description: "Description for Product 8" },
        { name: "Product 9", price: "FREE", description: "Description for Product 9" },
        { name: "Product 10", price: "$49.99", description: "Description for Product 10" },
        { name: "Product 11", price: "FREE", description: "Description for Product 11" },
        { name: "Product 12", price: "$59.99", description: "Description for Product 12" },
        { name: "Product 13", price: "FREE", description: "Description for Product 13" },
        { name: "Product 14", price: "$69.99", description: "Description for Product 14" },
        { name: "Product 15", price: "FREE", description: "Description for Product 15" },
        // Add more products as needed
    ];

    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const productsToDisplay = dummyProducts.slice(startIndex, endIndex);

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

    updatePagination(page, Math.ceil(dummyProducts.length / perPage));
}


function setupPagination() {
    const pagination = document.querySelector('.pagination');
    pagination.addEventListener('click', handlePaginationClick);
}

function handlePaginationClick(event) {
    if (event.target.tagName === 'BUTTON') {
        const page = parseInt(event.target.textContent);
        if (!isNaN(page)) {
            loadProducts(page);
        } else if (event.target.textContent === '<') {
            const activePage = document.querySelector('.pagination .active');
            const prevPage = parseInt(activePage.textContent) - 1;
            if (prevPage > 0) {
                loadProducts(prevPage);
            }
        } else if (event.target.textContent === '>') {
            const activePage = document.querySelector('.pagination .active');
            const nextPage = parseInt(activePage.textContent) + 1;
            const totalPages = document.querySelectorAll('.pagination button').length - 2; // Subtract prev and next buttons
            if (nextPage <= totalPages) {
                loadProducts(nextPage);
            }
        }
    }
}

function updatePagination(currentPage, totalPages) {
    const pagination = document.querySelector('.pagination');
    pagination.innerHTML = '';

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    pagination.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pagination.appendChild(pageButton);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    pagination.appendChild(nextButton);
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-card');
    card.innerHTML = `
        <div class="img-container"></div>
        <div class="product-title">
            <p>${product.name}</p>
            <p>${product.price}</p>
        </div>
        <p class="product-body">${product.description}</p>
        <div class="buttons">
            <button class="registry-button">Save to Registry</button>
            <button class="info-button">More Information</button>
        </div>
    `;
    return card;
}
