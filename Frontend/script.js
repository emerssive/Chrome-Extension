document.addEventListener('DOMContentLoaded', function() {
    const filterContent = document.querySelector('.filter-content');
    const filterTags = document.querySelector('.filter-tags');
    const checkboxes = filterContent.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                addFilterTag(this.value, this.parentElement.textContent.trim());
            } else {
                removeFilterTag(this.value);
            }
        });
    });

    function addFilterTag(value, text) {
        const tag = document.createElement('span');
        tag.classList.add('filter-tag');
        tag.dataset.value = value;
        tag.innerHTML = `${text} <span class="remove">×</span>`;
        tag.querySelector('.remove').addEventListener('click', function() {
            removeFilterTag(value);
            const checkbox = filterContent.querySelector(`input[value="${value}"]`);
            if (checkbox) checkbox.checked = false;
        });
        filterTags.appendChild(tag);
    }

    function removeFilterTag(value) {
        const tag = filterTags.querySelector(`.filter-tag[data-value="${value}"]`);
        if (tag) tag.remove();
    }
});