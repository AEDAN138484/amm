(function() {
    document.getElementById('back-to-map-btn').addEventListener('click', () => {
        window.location.href = '/';
    });

    function showCustomAlert(message, title = 'پیام') {
        const modal = document.getElementById('custom-alert-modal');
        document.getElementById('custom-alert-title').textContent = title;
        document.getElementById('custom-alert-message').textContent = message;
        modal.classList.add('active');
        
        return new Promise(resolve => {
            const okBtn = document.getElementById('custom-alert-ok-btn');
            okBtn.onclick = () => {
                modal.classList.remove('active');
                resolve();
            };
        });
    }
    
    let estates = [];
    const estatesPerPage = 12;
    let currentPage = 1;

    const estateListFullContainer = document.getElementById('estate-list-full-container');
    const paginationControls = document.getElementById('pagination-controls');
    const searchInput = document.getElementById('search-input');
    const featuredFilter = document.getElementById('featured-filter');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const minAreaInput = document.getElementById('min-area');
    const maxAreaInput = document.getElementById('max-area');
    const applyFilterBtn = document.getElementById('apply-filter');
    const resetFilterBtn = document.getElementById('reset-filter');
    const estateTypeFilters = document.querySelectorAll('.estate-type-filter');

    async function fetchAndDisplayEstates() {
        try {
            estateListFullContainer.innerHTML = '<p style="text-align: center; padding: 20px;">در حال بارگذاری املاک...</p>';
            const response = await fetch('/api/estates');
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.error || 'خطا در دریافت داده‌ها');
            }
            estates = await response.json();
            applyFiltersAndDisplay();
        } catch (error) {
            console.error('خطا در بارگذاری املاک:', error);
            estateListFullContainer.innerHTML = `<p style="text-align: center; padding: 20px; color: var(--danger-color);">خطا: ${error.message}</p>`;
            await showCustomAlert(`خطا در بارگذاری املاک: ${error.message}`, 'خطا');
        }
    }

    function applyFiltersAndDisplay() {
        const searchText = searchInput.value.trim().toLowerCase();
        const onlyFeatured = featuredFilter.checked;
        const minPrice = minPriceInput.value.trim() === '' ? 0 : Number(minPriceInput.value);
        const maxPrice = maxPriceInput.value.trim() === '' ? Infinity : Number(maxPriceInput.value);
        const minArea = minAreaInput.value.trim() === '' ? 0 : Number(minAreaInput.value);
        const maxArea = maxAreaInput.value.trim() === '' ? Infinity : Number(maxAreaInput.value);
        const selectedType = Array.from(estateTypeFilters)
            .find(btn => btn.classList.contains('active'))
            ?.getAttribute('data-type') || 'all';

        const filteredEstates = estates.filter(estate => {
            if (!estate) return false;
            const matchesSearch = searchText
                ? (estate.title || '').toLowerCase().includes(searchText) ||
                  (estate.address || '').toLowerCase().includes(searchText) ||
                  (estate.description || '').toLowerCase().includes(searchText) ||
                  (estate.owner || '').toLowerCase().includes(searchText)
                : true;
            const matchesFeatured = onlyFeatured ? estate.featured : true;
            const estatePrice = typeof estate.totalPrice === 'number' ? estate.totalPrice : 0;
            const matchesPrice = estatePrice >= minPrice && estatePrice <= maxPrice;
            const estateArea = typeof estate.builtArea === 'number' ? estate.builtArea : 0;
            const matchesArea = estateArea >= minArea && estateArea <= maxArea;
            const matchesType = selectedType === 'all' || estate.type === selectedType;
            return matchesSearch && matchesFeatured && matchesPrice && matchesArea && matchesType;
        });

        const totalPages = Math.ceil(filteredEstates.length / estatesPerPage);
        currentPage = Math.min(currentPage, totalPages || 1);
        const startIndex = (currentPage - 1) * estatesPerPage;
        const endIndex = startIndex + estatesPerPage;
        const estatesToDisplay = filteredEstates.slice(startIndex, endIndex);

        renderEstatesList(estatesToDisplay);
        renderPagination(totalPages);
    }

    function renderEstatesList(estatesToDisplay) {
        estateListFullContainer.innerHTML = estatesToDisplay.length === 0
            ? '<p style="text-align: center; padding: 20px;">ملکی یافت نشد</p>'
            : '';

        estatesToDisplay.forEach(estate => {
            const typeInfo = {
                apartment: { text: 'آپارتمان', class: 'apartment' }, old: { text: 'کلنگی', class: 'old' },
                store: { text: 'مغازه', class: 'store' }, office: { text: 'دفتر کار', class: 'office' },
                villa: { text: 'ویلایی', class: 'villa' }, land: { text: 'زمین', class: 'land' }
            }[estate.type] || { text: 'نامشخص', class: '' };

            const dealText = {
                'pre-sale': 'پیش فروش', sale: 'فروش', mortgage: 'رهن', rent: 'اجاره'
            }[estate.dealType] || 'نامشخص';
            
            const photoIndicator = (estate.images && estate.images.length > 0)
                ? `<i class="fas fa-camera" style="color: var(--secondary-color); font-size: 0.8em; vertical-align: middle; margin-left: 5px;"></i>`
                : '';

            const estateItem = document.createElement('div');
            estateItem.className = `estate-item-full`;
            estateItem.innerHTML = `
                <a href="/estate-detail/${estate.id}">
                    <h4>
                       ${photoIndicator}<span>${estate.title || 'بدون عنوان'}</span>
                       ${estate.featured ? '<i class="fas fa-star featured-star"></i>' : ''}
                    </h4>
                    <div class="details">
                        <span class="badge ${typeInfo.class}">${typeInfo.text}</span>
                        <span class="detail-badge">${dealText || 'نامشخص'}</span>
                        <span class="detail-badge">${estate.totalPrice ? estate.totalPrice.toLocaleString('fa-IR') : 'نامشخص'} تومان</span>
                        ${(estate.builtArea !== null && typeof estate.builtArea === 'number') ? `<span class="detail-badge">${estate.builtArea} متر</span>` : ''}
                        <span class="detail-badge">${estate.address || 'نامشخص'}</span>
                    </div>
                    <p class="description">${estate.description || 'بدون توضیحات'}</p>
                </a>
            `;
            estateListFullContainer.appendChild(estateItem);
        });
    }

    function renderPagination(totalPages) {
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        const windowSize = 2;

        const createPageButton = (page) => {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = page;
            if (page === currentPage) {
                pageBtn.className = 'active';
            }
            pageBtn.addEventListener('click', () => {
                currentPage = page;
                applyFiltersAndDisplay();
            });
            return pageBtn;
        };

        const createEllipsis = () => {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '10px 5px';
            ellipsis.style.alignSelf = 'center';
            return ellipsis;
        };

        const pageNumbers = [];
        
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'قبلی';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            currentPage--;
            applyFiltersAndDisplay();
        });
        paginationControls.appendChild(prevBtn);
        
        if (totalPages <= 5 + (windowSize * 2)) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            pageNumbers.push(1); 

            if (currentPage > windowSize + 2) {
                pageNumbers.push('...');
            }

            for (let i = Math.max(2, currentPage - windowSize); i <= Math.min(totalPages - 1, currentPage + windowSize); i++) {
                pageNumbers.push(i);
            }
            
            if (currentPage < totalPages - (windowSize + 1)) {
                pageNumbers.push('...');
            }

            if (totalPages > 1) {
                pageNumbers.push(totalPages);
            }
        }

        const uniquePageNumbers = [...new Set(pageNumbers)]; 

        uniquePageNumbers.forEach(page => {
            if (page === '...') {
                paginationControls.appendChild(createEllipsis());
            } else {
                paginationControls.appendChild(createPageButton(page));
            }
        });

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'بعدی';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            currentPage++;
            applyFiltersAndDisplay();
        });
        paginationControls.appendChild(nextBtn);
    }

    applyFilterBtn.addEventListener('click', () => { currentPage = 1; applyFiltersAndDisplay(); });
    resetFilterBtn.addEventListener('click', () => {
        searchInput.value = '';
        featuredFilter.checked = false;
        estateTypeFilters.forEach(btn => btn.classList.remove('active'));
        document.querySelector('.estate-type-filter[data-type="all"]').classList.add('active');
        minPriceInput.value = '';
        maxPriceInput.value = '';
        minAreaInput.value = '';
        maxAreaInput.value = '';
        currentPage = 1;
        applyFiltersAndDisplay();
    });
    estateTypeFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            estateTypeFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPage = 1;
            applyFiltersAndDisplay();
        });
    });

    fetchAndDisplayEstates();
})();