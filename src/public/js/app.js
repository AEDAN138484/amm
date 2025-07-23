const app = {
    CONFIG: {
        kermanshahCoords: [34.3142, 47.0650],
        mapZoom: 13,
        propertyTypes: {
            apartment: { text: 'آپارتمان', class: 'apartment', color: '#4CAF50' },
            villa: { text: 'ویلایی', class: 'villa', color: '#2196F3' },
            land: { text: 'زمین', class: 'land', color: '#795548' },
            store: { text: 'مغازه', class: 'store', color: '#FF9800' },
            office: { text: 'دفتر کار', color: '#9C27B0' },
            old: { text: 'کلنگی', class: 'old', color: '#607D8B' },
        },
        dealTypes: {
            'pre-sale': 'پیش فروش', 'sale': 'فروش', 'mortgage': 'رهن', 'rent': 'اجاره'
        }
    },

    appState: {
        estates: [],
        editingEstateId: null,
        isSortAscending: true,
        isQuietMode: false,
    },

    DOMElements: {},

    cacheDOMElements() {
        this.DOMElements = {
            panelToggle: document.getElementById('panel-toggle'),
            controlPanel: document.getElementById('control-panel'),
            currentDate: document.getElementById('current-date'),
            tabs: document.querySelectorAll('.tab'),
            tabContents: document.querySelectorAll('.tab-content'),
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            addForm: { 
                form: document.getElementById('estate-form'), title: document.getElementById('estate-title'), ownerName: document.getElementById('owner-name'), 
                ownerPhone: document.getElementById('owner-phone'), date: document.getElementById('estate-date'), address: document.getElementById('estate-address'), 
                dealType: document.getElementById('deal-type'), estateType: document.getElementById('estate-type'), orientation: document.getElementById('orientation'), 
                totalFloors: document.getElementById('total-floors'), totalUnits: document.getElementById('total-units'), totalPrice: document.getElementById('total-price'),
                totalPriceWords: document.getElementById('total-price-words'), pricePerMeter: document.getElementById('price-per-meter'),
                pricePerMeterWords: document.getElementById('price-per-meter-words'), floor: document.getElementById('floor'), builtArea: document.getElementById('built-area'), 
                hasBedroom: document.getElementById('has-bedroom'), bedroomCountMain: document.getElementById('bedroom-count-main'), 
                bedroomsContainer: document.getElementById('bedrooms-container'), kitchenCabinets: document.getElementById('kitchen-cabinets'), 
                bathroomType: document.getElementById('bathroom-type'), flooring: document.getElementById('flooring'), hasParking: document.getElementById('has-parking'), 
                hasStorage: document.getElementById('has-storage'), hasBalcony: document.getElementById('has-balcony'), coolerType: document.getElementById('cooler-type'), 
                hasPackage: document.getElementById('has-package'), hasHeater: document.getElementById('has-heater'), hasElevator: document.getElementById('has-elevator'), 
                landArea: document.getElementById('land-area'), frontage: document.getElementById('frontage'), propertyStatus: document.getElementById('property-status'), 
                buildingAge: document.getElementById('building-age'), description: document.getElementById('estate-description'), images: document.getElementById('estate-images'), 
                imagePreview: document.getElementById('image-preview'), featured: document.getElementById('estate-featured'), 
                categoryFields: document.querySelectorAll('.form-group-category'),
                renovationStatus: document.getElementById('renovation-status'),
                alleyWidth: document.getElementById('alley-width')
            },
            confirmLocationBtn: document.getElementById('confirm-location'),
            submitEstateBtn: document.getElementById('submit-estate-btn'),
            backToLocationBtn: document.getElementById('back-to-location'),
            cancelEditBtn: document.getElementById('cancel-edit'),
            estateItemsContainer: document.getElementById('estate-items-container'),
            estateCount: document.getElementById('estate-count'),
            search: { 
                form: document.getElementById('search-form'), input: document.getElementById('search-input'), featuredFilter: document.getElementById('featured-filter'),
                minPrice: document.getElementById('min-price'), maxPrice: document.getElementById('max-price'), minArea: document.getElementById('min-area'),
                maxArea: document.getElementById('max-area'), applyBtn: document.getElementById('apply-filter'), resetBtn: document.getElementById('reset-filter'),
                sortByPriceBtn: document.getElementById('sort-by-price'), estateTypeFilters: document.querySelectorAll('.estate-type-filter')
            },
            goToEstatesListBtn: document.getElementById('go-to-estates-list-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            superAdminPanelBtn: document.getElementById('super-admin-panel-btn'),
            agencyPanelBtn: document.getElementById('agency-panel-btn'),
            agencyNameDisplay: document.getElementById('agency-name-display'),
        };
    },

    async init() {
        this.cacheDOMElements();

        mapManager.init(this.CONFIG, this.handleMapClick.bind(this), this.handleDraw.bind(this));
        form.init(this.DOMElements);
        
        this.setupEventListeners();
        
        ui.setCurrentDate(this.DOMElements.currentDate);
        ui.showRelevantFields(this.DOMElements.addForm.estateType.value, this.DOMElements);
        
        await this.checkUserRole();
        await this.fetchAndRenderEstates();
        await this.fetchAgencyInfo();
        
        const urlParams = new URLSearchParams(window.location.search);
        const estateIdToEdit = urlParams.get('edit');
        if (estateIdToEdit) {
            history.pushState(null, '', '/'); 
            await this.editEstate(estateIdToEdit);
        }
    },

    setupEventListeners() {
        this.DOMElements.panelToggle.addEventListener('click', () => ui.toggleControlPanel(this.DOMElements.controlPanel, this.DOMElements.panelToggle));
        this.DOMElements.tabs.forEach(tab => tab.addEventListener('click', (e) => ui.handleTabClick(e, this.appState, this.DOMElements, this.CONFIG)));
        this.DOMElements.confirmLocationBtn.addEventListener('click', () => form.confirmLocation(this.appState, this.DOMElements));
        this.DOMElements.backToLocationBtn.addEventListener('click', () => form.backToLocation(this.DOMElements));
        this.DOMElements.addForm.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
        this.DOMElements.cancelEditBtn.addEventListener('click', () => form.reset(this.appState, this.DOMElements, true));
        this.DOMElements.addForm.estateType.addEventListener('change', (e) => ui.showRelevantFields(e.target.value, this.DOMElements));
        this.DOMElements.addForm.images.addEventListener('change', () => form.handleImagePreview(this.DOMElements));
        this.DOMElements.addForm.hasBedroom.addEventListener('change', () => form.handleBedroomCheckbox(this.DOMElements));
        this.DOMElements.addForm.bedroomCountMain.addEventListener('input', () => form.handleBedroomCountInput(this.DOMElements));
        
        this.DOMElements.search.form.addEventListener('submit', e => e.preventDefault());
        this.DOMElements.search.applyBtn.addEventListener('click', () => this.applyAllFilters());
        this.DOMElements.search.resetBtn.addEventListener('click', () => this.resetFilters());
        this.DOMElements.search.sortByPriceBtn.addEventListener('click', () => this.handleSortByPrice());
        this.DOMElements.search.estateTypeFilters.forEach(btn => btn.addEventListener('click', (e) => this.handleTypeFilterClick(e.target)));
        
        this.DOMElements.logoutBtn.addEventListener('click', () => api.logout());
        if (this.DOMElements.goToEstatesListBtn) this.DOMElements.goToEstatesListBtn.addEventListener('click', () => window.location.href = '/estates-list.html');
        if (this.DOMElements.superAdminPanelBtn) this.DOMElements.superAdminPanelBtn.addEventListener('click', () => window.location.href = '/super-admin');
        if (this.DOMElements.agencyPanelBtn) this.DOMElements.agencyPanelBtn.addEventListener('click', () => window.location.href = '/agency-panel');

        this.DOMElements.addForm.totalPrice.addEventListener('input', () => ui.updatePriceWords(this.DOMElements.addForm.totalPrice, this.DOMElements.addForm.totalPriceWords));
        this.DOMElements.addForm.pricePerMeter.addEventListener('input', () => ui.updatePriceWords(this.DOMElements.addForm.pricePerMeter, this.DOMElements.addForm.pricePerMeterWords));
        
        mapManager.map.on('popupopen', (e) => {
            const container = e.popup.getElement();
            if (container) {
                container.addEventListener('click', this.handlePopupActions.bind(this));
            }
        });
    },

    toggleQuietMode() {
        if (mapManager.drawnItems.getLayers().length > 0) {
            return;
        }
        this.appState.isQuietMode = !this.appState.isQuietMode;
        this.resetFilters();
    },

    async fetchAgencyInfo() {
        try {
            const info = await api.getAgencyInfo();
            if(info.name) {
                this.DOMElements.agencyNameDisplay.textContent = info.name.startsWith('بنگاه') ? info.name : `املاک ${info.name}`;
            }
        } catch (error) {
            console.error(error.message);
        }
    },

    async checkUserRole() {
        try {
            const sessionInfo = await api.getSessionInfo();
            const role = sessionInfo.role;
            if (role === 'super_admin' || role === 'support_admin') {
                this.DOMElements.superAdminPanelBtn.style.display = 'inline-flex';
            }
            if (role === 'super_admin' || role === 'agency_admin') {
                this.DOMElements.agencyPanelBtn.style.display = 'inline-flex';
            }
        } catch (error) {
            console.error(error.message);
        }
    },

    async fetchAndRenderEstates() {
        ui.showSpinner();
        try {
            const fetchedEstates = await api.getEstates();
            this.appState.estates = fetchedEstates.filter(e => e?.location).map(estate => {
                const parseNum = (val) => {
                    const parsed = parseInt(String(val).replace(/,/g, ''), 10);
                    return isNaN(parsed) ? null : parsed;
                };
                return {
                    ...estate,
                    totalPrice: parseNum(estate.totalPrice),
                    pricePerMeter: parseNum(estate.pricePerMeter),
                    builtArea: parseNum(estate.builtArea),
                    totalFloors: parseNum(estate.totalFloors),
                    totalUnits: parseNum(estate.totalUnits),
                    floor: parseNum(estate.floor),
                    landArea: parseNum(estate.landArea),
                    frontage: parseNum(estate.frontage),
                    buildingAge: parseNum(estate.buildingAge),
                    alleyWidth: parseNum(estate.alleyWidth),
                    bedrooms: estate.bedrooms ? estate.bedrooms.map(b => ({
                        ...b,
                        area: parseNum(b.area)
                    })) : [],
                };
            });
            this.resetFilters();
        } catch (error) {
            let alertButtonText = 'تایید';
            let alertButtonCallback = null;
            if (error.code === 'SUBSCRIPTION_INACTIVE') {
                alertButtonText = 'خروج';
                alertButtonCallback = () => api.logout();
            }
            await ui.showCustomAlert('خطا در بارگذاری اطلاعات املاک: ' + error.message, 'خطا', alertButtonText, alertButtonCallback);
        } finally {
            ui.hideSpinner();
        }
    },
    
    async handleFormSubmit() {
        ui.showSpinner();
        try {
            const formData = form.getFormData(this.appState, this.DOMElements);
            await api.submitEstate(formData, this.appState.editingEstateId);
            await this.fetchAndRenderEstates();
            form.reset(this.appState, this.DOMElements, true);
            await ui.showCustomAlert(`ملک با موفقیت ${this.appState.editingEstateId ? 'به‌روزرسانی' : 'ثبت'} شد!`, 'موفقیت');
        } catch (error) {
            let alertButtonText = 'تایید';
            let alertButtonCallback = null;
            if (error.code === 'SUBSCRIPTION_INACTIVE') {
                alertButtonText = 'خروج';
                alertButtonCallback = () => api.logout();
            }
            await ui.showCustomAlert('خطا: ' + error.message, 'خطا', alertButtonText, alertButtonCallback);
        } finally {
            ui.hideSpinner();
        }
    },

    handleMapClick(e) {
        if (document.querySelector('.tab[data-tab="add"]').classList.contains('active')) {
            this.appState.selectedLocation = mapManager.addTempMarker(e.latlng, (newLatLng) => {
                this.appState.selectedLocation = newLatLng;
            });
        }
    },
    
    handleDraw(layer) {
        mapManager.drawnItems.clearLayers();
        mapManager.drawnItems.addLayer(layer);
        if (mapManager.clearSelectionControl) {
            mapManager.clearSelectionControl.getContainer().style.display = 'block';
        }
        if (mapManager.quietModeControl) {
            mapManager.quietModeControl.getContainer().classList.add('disabled');
        }
        this.applyAllFilters();
    },
    
    handlePopupActions(e) {
        const target = e.target.closest('.popup-action-btn');
        if (!target) return;
        const action = target.dataset.action;
        const id = target.dataset.id;
        if (!action || !id) return;

        if (action === 'delete') this.deleteEstate(id);
        else if (action === 'edit') this.editEstate(id);
        else if (action === 'details') window.location.href = `/estate-detail/${id}`;
    },
    
    updateEstateListUI(estates) {
        this.DOMElements.estateCount.textContent = estates.length;
        this.DOMElements.estateItemsContainer.innerHTML = estates.length === 0 ? '<p style="text-align: center; padding: 20px; color: #666;">ملکی یافت نشد</p>' : '';

        estates.forEach(estate => {
            const typeInfo = this.CONFIG.propertyTypes[estate.type] || { text: 'نامشخص', class: '' };
            const dealText = this.CONFIG.dealTypes[estate.dealType] || 'نامشخص';
            const photoIndicator = (estate.images && estate.images.length > 0)
                ? `<i class="fas fa-camera" style="color: var(--secondary-color); font-size: 0.8em; vertical-align: middle; margin-left: 5px;"></i>`
                : '';
            const estateItem = document.createElement('div');
            estateItem.className = 'estate-item';
            estateItem.dataset.id = estate.id;
            estateItem.innerHTML = `
                <h4>
                    ${photoIndicator}<span>${estate.title || 'بدون عنوان'}</span>
                    ${estate.featured ? '<i class="fas fa-star featured-star"></i>' : ''}
                </h4>
                <div class="estate-item-details">
                    <span class="badge ${typeInfo.class}">${typeInfo.text}</span>
                    <span>${dealText}</span>
                    <span>${(estate.totalPrice || 0).toLocaleString('fa-IR')} ت</span>
                </div>
                <div class="flex-grow-spacer"></div>
                <div class="estate-item-footer">
                     <p>متراژ: ${estate.builtArea || '?'} متر - ${estate.address || 'آدرس نامشخص'}</p>
                </div>
            `;
            estateItem.addEventListener('click', () => mapManager.zoomToMarker(estate.id));
            this.DOMElements.estateItemsContainer.appendChild(estateItem);
        });
    },

    applyAllFilters() {
        let filteredEstates = [...this.appState.estates];
    
        const { input, featuredFilter, minPrice, maxPrice, minArea, maxArea } = this.DOMElements.search;
        const searchText = input.value.trim().toLowerCase();
        const onlyFeatured = featuredFilter.checked;
        const minP = minPrice.value ? Number(minPrice.value) : null;
        const maxP = maxPrice.value ? Number(maxPrice.value) : null;
        const minA = minArea.value ? Number(minArea.value) : null;
        const maxA = maxArea.value ? Number(maxArea.value) : null;
        const selectedType = document.querySelector('.estate-type-filter.active')?.dataset.type || 'all';

        filteredEstates = filteredEstates.filter(e => {
            const combinedText = `${e.title || ''} ${e.address || ''} ${e.description || ''} ${e.owner || ''} ${e.phone || ''}`.toLowerCase();
            return (searchText ? combinedText.includes(searchText) : true) &&
                   (onlyFeatured ? e.featured : true) &&
                   (minP === null || e.totalPrice >= minP) && (maxP === null || e.totalPrice <= maxP) &&
                   (minA === null || e.builtArea >= minA) && (maxA === null || e.builtArea <= maxA) &&
                   (selectedType === 'all' || e.type === selectedType);
        });

        const drawnLayers = mapManager.drawnItems.getLayers();
        if (drawnLayers.length > 0) {
            const bounds = drawnLayers[0].getBounds();
            filteredEstates = filteredEstates.filter(e => {
                if (!e.location) return false;
                const latLng = L.latLng(e.location[0], e.location[1]);
                return bounds.contains(latLng);
            });
        }
        
        this.updateEstateListUI(filteredEstates);
        mapManager.updateMarkers(filteredEstates, this.CONFIG);
    },

    resetFilters() {
        this.DOMElements.search.form.reset();
        this.DOMElements.search.estateTypeFilters.forEach(btn => btn.classList.remove('active'));
        document.querySelector('.estate-type-filter[data-type="all"]').classList.add('active');
        
        mapManager.clearDrawings();
        
        if (mapManager.quietModeControl) {
            mapManager.quietModeControl.getContainer().classList.remove('disabled');
        }

        const estatesToShow = this.appState.isQuietMode ? [] : this.appState.estates;
        this.updateEstateListUI(estatesToShow); 
        mapManager.updateMarkers(estatesToShow, this.CONFIG);
    },
    
    handleSortByPrice() {
        const currentDisplayedIds = new Set(Array.from(this.DOMElements.estateItemsContainer.children, item => item.dataset.id));
        const currentList = this.appState.estates.filter(e => currentDisplayedIds.has(String(e.id)));
        
        currentList.sort((a, b) => this.appState.isSortAscending ? a.totalPrice - b.totalPrice : b.totalPrice - a.totalPrice);
        this.appState.isSortAscending = !this.appState.isSortAscending;
        this.DOMElements.search.sortByPriceBtn.innerHTML = `<i class="fas fa-sort-amount-${this.appState.isSortAscending ? 'down' : 'up'}"></i> قیمت`;
        
        this.updateEstateListUI(currentList);
    },
    
    handleTypeFilterClick(button) {
        this.DOMElements.search.estateTypeFilters.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        this.applyAllFilters();
    },

    async editEstate(id) {
        ui.showSpinner();
        try {
            const estate = await api.getEstateById(id);
            this.appState.editingEstateId = id;
            this.populateFormForEdit(estate);
        } catch (error) {
            await ui.showCustomAlert(`خطایی در آماده‌سازی فرم ویرایش رخ داد: ${error.message}`, 'خطا');
        } finally {
            ui.hideSpinner();
        }
    },

    async deleteEstate(id) {
        const confirmed = await ui.showCustomConfirm('آیا مطمئن هستید می‌خواهید این ملک را حذف کنید؟', 'تایید حذف');
        if (!confirmed) return;
        ui.showSpinner();
        try {
            await api.deleteEstate(id);
            await ui.showCustomAlert('ملک با موفقیت حذف شد.', 'موفقیت');
            await this.fetchAndRenderEstates();
        } catch (error) {
            await ui.showCustomAlert(`خطا در حذف ملک: ${error.message}`, 'خطا');
        } finally {
            ui.hideSpinner();
        }
    },

    populateFormForEdit(estate) {
        form.reset(this.appState, this.DOMElements, false);
        this.appState.editingEstateId = estate.id;
        
        const fieldMap = {
            title: estate.title, ownerName: estate.owner, ownerPhone: estate.phone,
            address: estate.address, dealType: estate.dealType, estateType: estate.type,
            totalPrice: estate.totalPrice, pricePerMeter: estate.pricePerMeter,
            builtArea: estate.builtArea, orientation: estate.orientation,
            totalFloors: estate.totalFloors, totalUnits: estate.totalUnits,
            floor: estate.floor, kitchenCabinets: estate.kitchenCabinets,
            bathroomType: estate.bathroomType, flooring: estate.flooring,
            coolerType: estate.coolerType, propertyStatus: estate.propertyStatus,
            buildingAge: estate.buildingAge, landArea: estate.landArea,
            frontage: estate.frontage, description: estate.description,
            hasParking: estate.hasParking, hasStorage: estate.hasStorage,
            hasBalcony: estate.hasBalcony, hasPackage: estate.hasPackage,
            hasHeater: estate.hasHeater, hasElevator: estate.hasElevator,
            featured: estate.featured,
            renovationStatus: estate.renovationStatus,
            alleyWidth: estate.alleyWidth
        };

        const addForm = this.DOMElements.addForm;
        for (const [key, value] of Object.entries(fieldMap)) {
            if (addForm[key]) {
                if (addForm[key].type === 'checkbox') {
                    addForm[key].checked = value || false;
                } else {
                    addForm[key].value = value || '';
                }
            }
        }
        
        ui.showRelevantFields(estate.type, this.DOMElements);

        if (estate.bedrooms?.length > 0) {
            addForm.hasBedroom.checked = true;
            form.handleBedroomCheckbox(this.DOMElements);
            addForm.bedroomCountMain.value = estate.bedrooms.length;
            form.handleBedroomCountInput(this.DOMElements);
            estate.bedrooms.forEach((bedroom, index) => {
                const areaInput = addForm.bedroomsContainer.querySelectorAll('.bedroom-area-input')[index];
                const masterInput = addForm.bedroomsContainer.querySelectorAll('.bedroom-master-input')[index];
                if (areaInput) areaInput.value = bedroom.area || '';
                if (masterInput) masterInput.checked = bedroom.isMaster || false;
            });
        }

        if (jQuery.fn.pDatepicker && estate.date) {
            $(addForm.date).pDatepicker('setDate', new persianDate(new Date(estate.date)).valueOf());
        } else {
            addForm.date.value = estate.date || '';
        }

        addForm.imagePreview.innerHTML = '';
        if (estate.images?.length > 0) {
            estate.images.forEach(imgSrc => {
                const img = document.createElement('img');
                img.src = imgSrc;
                img.dataset.existing = 'true';
                img.dataset.src = imgSrc;
                
                const removeBtn = document.createElement('span');
                removeBtn.innerHTML = '&times;';
                removeBtn.style.cssText = 'position:absolute; top:2px; right:5px; cursor:pointer; color:white; background:rgba(0,0,0,0.6); border-radius:50%; width:18px; height:18px; text-align:center; line-height:16px;';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    img.parentElement.remove();
                };
                
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);

                addForm.imagePreview.appendChild(wrapper);
            });
        }

        this.appState.selectedLocation = mapManager.addTempMarker(L.latLng(estate.location[0], estate.location[1]), (newLatLng) => {
            this.appState.selectedLocation = newLatLng;
        });
        
        this.DOMElements.tabs.forEach(t => t.classList.remove('active'));
        document.querySelector('.tab[data-tab="add"]').classList.add('active');
        this.DOMElements.tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById('add-tab').classList.add('active');
        
        this.DOMElements.step1.classList.remove('active');
        this.DOMElements.step2.classList.add('active');
        
        this.DOMElements.submitEstateBtn.innerHTML = '<i class="fas fa-save"></i> به‌روزرسانی ملک';
        this.DOMElements.backToLocationBtn.style.display = 'none';
        this.DOMElements.cancelEditBtn.style.display = 'inline-flex';

        ui.updatePriceWords(addForm.totalPrice, addForm.totalPriceWords);
        ui.updatePriceWords(addForm.pricePerMeter, addForm.pricePerMeterWords);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());