(function() {
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

    function showCustomConfirm(message, title = 'تایید') {
        const modal = document.getElementById('custom-alert-modal');
        document.getElementById('custom-alert-title').textContent = title;
        document.getElementById('custom-alert-message').textContent = message;
        const buttonsContainer = modal.querySelector('.custom-modal-buttons');
        buttonsContainer.innerHTML = `
            <button class="confirm-btn" id="custom-confirm-yes-btn">بله</button>
            <button class="cancel-btn" id="custom-confirm-no-btn">خیر</button>
        `;
        modal.classList.add('active');
        return new Promise(resolve => {
            const yesBtn = document.getElementById('custom-confirm-yes-btn');
            const noBtn = document.getElementById('custom-confirm-no-btn');
            const cleanup = (result) => {
                modal.classList.remove('active');
                buttonsContainer.innerHTML = `<button class="confirm-btn" id="custom-alert-ok-btn">تایید</button>`;
                resolve(result);
            };
            yesBtn.onclick = () => cleanup(true);
            noBtn.onclick = () => cleanup(false);
        });
    }

    function showRelevantDetails(selectedType) {
        const visibilityMap = {
            apartment: ['all', 'apartment'],
            villa: ['all', 'villa'],
            office: ['all', 'office'],
            store: ['all', 'store'],
            land: ['all', 'land'],
            old: ['all', 'old', 'land']
        };
        const allowedClasses = visibilityMap[selectedType] || ['all'];
        const allItems = document.querySelectorAll('.detail-info .item');
        
        allItems.forEach(item => {
            const itemClasses = Array.from(item.classList);
            const isVisible = itemClasses.some(cls => allowedClasses.includes(cls));
            item.style.display = isVisible ? 'flex' : 'none';
        });
    }

    function createTooltip(bedrooms) {
        const tooltip = document.createElement('div');
        tooltip.className = 'details-tooltip';
        let tooltipHTML = '';
        bedrooms.forEach((bed, index) => {
            const area = bed.area ? `${bed.area} متر` : 'نامشخص';
            const master = bed.isMaster ? ' - مستر' : '';
            tooltipHTML += `<p>خواب ${index + 1}: ${area}${master}</p>`;
        });
        tooltip.innerHTML = tooltipHTML;
        return tooltip;
    }

    async function fetchEstateDetails() {
        try {
            const estateId = window.location.pathname.split('/').pop();
            const response = await fetch(`/api/estates/${estateId}`);
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                const errorData = await response.json();
                throw new Error(response.status === 404 ? 'ملک یافت نشد' : errorData.error || 'خطا در دریافت داده‌ها');
            }
            const estate = await response.json();
            displayEstateDetails(estate);
        } catch (error) {
            console.error('خطا در بارگذاری جزئیات ملک:', error);
            await showCustomAlert(`خطا در بارگذاری جزئیات ملک: ${error.message}`, 'خطا');
        }
    }

    function displayEstateDetails(estate) {
        showRelevantDetails(estate.type);

        const translations = {
            type: { apartment: 'آپارتمان', old: 'کلنگی', store: 'مغازه', office: 'دفتر کار', villa: 'ویلایی', land: 'زمین' },
            dealType: { 'pre-sale': 'پیش فروش', sale: 'فروش', mortgage: 'رهن', rent: 'اجاره' },
            propertyStatus: { 'owner-occupied': 'تحت استفاده مالک', vacant: 'تخلیه', rented: 'اجاره' },
            renovationStatus: { 'new': 'نوساز', 'renovated': 'بازسازی شده', 'old': 'قدیمی' },
            orientation: { north: 'شمالی', south: 'جنوبی', east: 'شرقی', west: 'غربی' },
            kitchenCabinets: { mdf: 'MDF', metal: 'فلزی', highgloss: 'هایگلاس' },
            bathroomType: { iranian: 'ایرانی', western: 'فرنگی', both: 'ایرانی و فرنگی' },
            flooring: { ceramic: 'سرامیک', parquet: 'پارکت', stone: 'سنگ', carpet: 'موکت' },
            coolerType: { water: 'آبی', gas: 'گازی' }
        };

        const titleEl = document.getElementById('estate-title');
        titleEl.innerHTML = `<span>${estate.title || 'بدون عنوان'}</span> ${estate.featured ? '<i class="fas fa-star featured-star"></i>' : ''}`;
        
        const fields = {
            'estate-type': translations.type[estate.type],
            'deal-type': translations.dealType[estate.dealType],
            'total-price': estate.totalPrice ? estate.totalPrice.toLocaleString('fa-IR') : null,
            'address': estate.address,
            'owner': estate.owner,
            'phone': estate.phone,
            'property-status': translations.propertyStatus[estate.propertyStatus],
            'building-age': estate.buildingAge,
            'price-per-meter': estate.pricePerMeter ? estate.pricePerMeter.toLocaleString('fa-IR') : null,
            'orientation': translations.orientation[estate.orientation],
            'total-floors': estate.totalFloors,
            'total-units': estate.totalUnits,
            'floor': estate.floor,
            'kitchen-cabinets': translations.kitchenCabinets[estate.kitchenCabinets],
            'bathroom-type': translations.bathroomType[estate.bathroomType],
            'flooring': translations.flooring[estate.flooring],
            'cooler-type': translations.coolerType[estate.coolerType],
            'has-parking': estate.hasParking ? 'بله' : 'خیر',
            'has-storage': estate.hasStorage ? 'بله' : 'خیر',
            'has-balcony': estate.hasBalcony ? 'بله' : 'خیر',
            'has-package': estate.hasPackage ? 'بله' : 'خیر',
            'has-heater': estate.hasHeater ? 'بله' : 'خیر',
            'has-elevator': estate.hasElevator ? 'بله' : 'خیر',
            'built-area': estate.builtArea,
            'land-area': estate.landArea,
            'frontage': estate.frontage,
            'alley-width': estate.alleyWidth,
            'renovation-status': translations.renovationStatus[estate.renovationStatus],
            'description': estate.description
        };

        for (const [id, value] of Object.entries(fields)) {
            const element = document.getElementById(id);
            if (element) {
                const parentItem = element.closest('.item') || element.closest('.detail-section');
                if (value !== null && value !== undefined && value !== '') {
                    element.textContent = value;
                } else {
                    if (parentItem && parentItem.style.display !== 'none') {
                        parentItem.style.display = 'none';
                    }
                }
            }
        }

        const bedroomsSpan = document.getElementById('bedrooms');
        if (estate.bedrooms && estate.bedrooms.length > 0) {
            bedroomsSpan.textContent = `${estate.bedrooms.length} عدد`;
            bedroomsSpan.classList.add('has-tooltip');
            const tooltipElement = createTooltip(estate.bedrooms);
            bedroomsSpan.appendChild(tooltipElement);
        } else {
            bedroomsSpan.closest('.item').style.display = 'none';
        }

        const imagesContainer = document.getElementById('estate-images');
        imagesContainer.innerHTML = '';
        if (estate.images?.length > 0) {
            imagesContainer.closest('.detail-section').style.display = 'block';
            estate.images.forEach(img => {
                const imgElement = document.createElement('img');
                imgElement.src = img;
                imagesContainer.appendChild(imgElement);
            });
        } else {
            imagesContainer.closest('.detail-section').style.display = 'none';
        }
    }

    function editEstate() {
        const estateId = window.location.pathname.split('/').pop();
        window.location.href = `/?edit=${estateId}`;
    }
    
    async function deleteEstate() {
         const confirmed = await showCustomConfirm('آیا مطمئن هستید می‌خواهید این ملک را حذف کنید؟ این عمل غیرقابل بازگشت است.', 'تایید حذف');
         if (!confirmed) return;
         try {
             const estateId = window.location.pathname.split('/').pop();
             const response = await fetch(`/api/estates/${estateId}`, { method: 'DELETE' });
             if (response.ok) {
                 await showCustomAlert('ملک با موفقیت حذف شد.', 'موفقیت');
                 window.location.href = '/estates-list.html';
             } else {
                 if (response.status === 401) {
                     window.location.href = '/login';
                     return;
                 }
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'خطا در حذف ملک');
             }
         } catch (error) {
             console.error('خطا در حذف ملک:', error);
             await showCustomAlert(`خطا در حذف ملک: ${error.message}`, 'خطا');
         }
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        fetchEstateDetails();
        document.getElementById('back-to-list-btn').addEventListener('click', () => {
            window.location.href = '/estates-list.html';
        });
        document.getElementById('edit-estate-btn').addEventListener('click', editEstate);
        document.getElementById('delete-estate-btn').addEventListener('click', deleteEstate);

        const imageModal = document.getElementById('image-modal');
        const modalImageContent = document.getElementById('modal-image-content');
        const closeModalBtn = document.querySelector('.image-modal-close');
        const imagesContainer = document.getElementById('estate-images');

        imagesContainer.addEventListener('click', (event) => {
            if (event.target.tagName === 'IMG') {
                imageModal.classList.add('active');
                modalImageContent.src = event.target.src;
            }
        });

        const closeModal = () => {
            imageModal.classList.remove('active');
        };

        closeModalBtn.addEventListener('click', closeModal);
        imageModal.addEventListener('click', (event) => {
            if (event.target === imageModal) {
                closeModal();
            }
        });
    });
})();