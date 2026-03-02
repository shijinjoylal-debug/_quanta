document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('resultsContainer');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        displayResults(query);
    });

    function displayResults(query) {
        resultsContainer.innerHTML = '';

        if (!query) {
            return;
        }

        const filteredData = searchData.filter(item => {
            return item.title.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.keywords.some(k => k.toLowerCase().includes(query));
        });

        if (filteredData.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results">No results found.</p>';
            return;
        }

        filteredData.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('result-item');

            const title = document.createElement('a');
            title.href = item.url;
            title.textContent = item.title;
            title.classList.add('result-title');

            const desc = document.createElement('p');
            desc.textContent = item.description;
            desc.classList.add('result-desc');

            resultItem.appendChild(title);
            resultItem.appendChild(desc);
            resultsContainer.appendChild(resultItem);
        });
    }

    // Initial load - optional
    // displayResults('');
});
