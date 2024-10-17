document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchTags = document.getElementById('search-tags');
    const dropdownBtn = document.getElementById('dropdown-btn');
    const dropdownContent = document.getElementById('dropdown-content');
    const searchBtn = document.getElementById('search-btn');
    const productGrid = document.getElementById('product-grid');

    // Set initial search term
    searchInput.value = 'Video interviews';
    addSearchTag('Video interviews');

    // Toggle dropdown
    dropdownBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    window.addEventListener('click', function() {
        dropdownContent.style.display = 'none';
    });

    // Handle checkbox changes
    dropdownContent.addEventListener('change', function(event) {
        if (event.target.type === 'checkbox') {
            const label = event.target.parentElement.textContent.trim();
            if (event.target.checked) {
                addSearchTag(label);
            } else {
                removeSearchTag(label);
            }
        }
    });

    function addSearchTag(label) {
        const tag = document.createElement('div');
        tag.className = 'search-tag';
        tag.innerHTML = `${label} <span class="close-tag">×</span>`;
        tag.querySelector('.close-tag').addEventListener('click', function() {
            removeSearchTag(label);
            const checkbox = [...dropdownContent.querySelectorAll('input[type="checkbox"]')]
                .find(cb => cb.parentElement.textContent.trim() === label);
            if (checkbox) checkbox.checked = false;
        });
        searchTags.appendChild(tag);
    }

    function removeSearchTag(label) {
        const tags = searchTags.querySelectorAll('.search-tag');
        for (let tag of tags) {
            if (tag.textContent.trim().slice(0, -1) === label) {
                tag.remove();
                break;
            }
        }
    }

    // Generate product cards
    function generateProductCards() {
        productGrid.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image"></div>
                <div class="product-name">Name</div>
                <div class="product-price">FREE</div>
                <div class="product-description">Please add your content here. Keep it short and simple. And smile :)</div>
                <div class="product-buttons">
                    <button>Button 2</button>
                    <button>Button 1</button>
                </div>
            `;
            productGrid.appendChild(card);
        }
    }

    // Initial product card generation
    generateProductCards();

    // Search button click event
    searchBtn.addEventListener('click', function() {
        // Here you would typically fetch data from an API
        // For this example, we'll just regenerate the product cards
        generateProductCards();
    });
});