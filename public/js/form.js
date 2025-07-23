const form = {
    init(DOMElements) {
        if (jQuery?.fn.pDatepicker) {
            $(DOMElements.addForm.date).pDatepicker({ format: 'YYYY/MM/DD', autoClose: true, initialValue: true, initialValueType: 'persian' });
        }
    },

    async confirmLocation(appState, DOMElements) {
        if (!appState.selectedLocation) { 
            await ui.showCustomAlert('لطفاً ابتدا روی نقشه کلیک کنید.', 'راهنمایی');
            return;
        }
        DOMElements.step1.classList.remove('active');
        DOMElements.step2.classList.add('active');
    },

    backToLocation(DOMElements) {
        DOMElements.step2.classList.remove('active');
        DOMElements.step1.classList.add('active');
    },

    getFormData(appState, DOMElements) {
        const addForm = DOMElements.addForm;
        const formData = new FormData();

        const safeParseInt = (value) => {
            if (value === null || String(value).trim() === '') return null;
            const parsed = parseInt(String(value).replace(/,/g, ''), 10);
            return isNaN(parsed) ? null : parsed;
        };
        
        const fields = {
            id: appState.editingEstateId || Date.now(),
            location: JSON.stringify(appState.selectedLocation ? [appState.selectedLocation.lat, appState.selectedLocation.lng] : null),
            timestamp: new Date().toISOString(),
            title: addForm.title.value.trim(),
            owner: addForm.ownerName.value.trim() || 'نامشخص',
            phone: addForm.ownerPhone.value.trim() || 'نامشخص',
            date: addForm.date.value,
            address: addForm.address.value.trim(),
            dealType: addForm.dealType.value,
            type: addForm.estateType.value,
            totalPrice: safeParseInt(addForm.totalPrice.value),
            pricePerMeter: safeParseInt(addForm.pricePerMeter.value),
            builtArea: safeParseInt(addForm.builtArea.value),
            bedrooms: JSON.stringify(Array.from(addForm.bedroomsContainer.querySelectorAll('.bedroom-input-group')).map(group => ({
                area: safeParseInt(group.querySelector('.bedroom-area-input').value) || 0,
                isMaster: group.querySelector('.bedroom-master-input').checked
            }))),
            totalFloors: safeParseInt(addForm.totalFloors.value),
            totalUnits: safeParseInt(addForm.totalUnits.value),
            floor: safeParseInt(addForm.floor.value),
            orientation: addForm.orientation.value,
            kitchenCabinets: addForm.kitchenCabinets.value,
            bathroomType: addForm.bathroomType.value,
            flooring: addForm.flooring.value,
            coolerType: addForm.coolerType.value,
            hasParking: addForm.hasParking.checked,
            hasStorage: addForm.hasStorage.checked,
            hasBalcony: addForm.hasBalcony.checked,
            hasPackage: addForm.hasPackage.checked,
            hasHeater: addForm.hasHeater.checked,
            hasElevator: addForm.hasElevator.checked,
            landArea: safeParseInt(addForm.landArea.value),
            frontage: safeParseInt(addForm.frontage.value),
            propertyStatus: addForm.propertyStatus.value,
            buildingAge: safeParseInt(addForm.buildingAge.value),
            description: addForm.description.value.trim(),
            featured: addForm.featured.checked,
            renovationStatus: addForm.renovationStatus.value,
            alleyWidth: safeParseInt(addForm.alleyWidth.value)
        };

        for(const [key, value] of Object.entries(fields)) {
            if (value !== null) {
                formData.append(key, value);
            }
        }

        const newFiles = addForm.images.files;
        for (let i = 0; i < newFiles.length; i++) {
            formData.append('images', newFiles[i]);
        }
        
        if (appState.editingEstateId) {
            const existingImages = Array.from(addForm.imagePreview.querySelectorAll('img[data-existing="true"]'))
                                        .map(img => img.dataset.src);
            formData.append('existingImages', JSON.stringify(existingImages));
        }

        return formData;
    },

    reset(appState, DOMElements, switchToSearchTab = true) {
        const addForm = DOMElements.addForm;
        addForm.form.reset();
        
        ui.updatePriceWords(addForm.totalPrice, addForm.totalPriceWords);
        ui.updatePriceWords(addForm.pricePerMeter, addForm.pricePerMeterWords);
        
        appState.editingEstateId = null;
        DOMElements.submitEstateBtn.innerHTML = '<i class="fas fa-save"></i> ثبت ملک';
        DOMElements.backToLocationBtn.style.display = 'inline-flex';
        DOMElements.cancelEditBtn.style.display = 'none';

        if (jQuery.fn.pDatepicker) $(addForm.date).pDatepicker('setDate', new Date());
        addForm.imagePreview.innerHTML = '';
        addForm.bedroomsContainer.innerHTML = '';
        this.handleBedroomCheckbox(DOMElements);

        if (switchToSearchTab) {
            DOMElements.step2.classList.remove('active');
            DOMElements.step1.classList.add('active');
            DOMElements.tabs.forEach(t => t.classList.remove('active'));
            document.querySelector('.tab[data-tab="search"]').classList.add('active');
            DOMElements.tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById('search-tab').classList.add('active');
        }

        mapManager.removeTempMarker();
        appState.selectedLocation = null;
        ui.showRelevantFields(addForm.estateType.value, DOMElements);
    },
    
    async handleImagePreview(DOMElements) {
        const preview = DOMElements.addForm.imagePreview;
        const files = DOMElements.addForm.images.files;
        
        const existingImagesCount = preview.querySelectorAll('img[data-existing="true"]').length;
        const newImagesCount = files.length;

        if ((existingImagesCount + newImagesCount) > 3) {
            await ui.showCustomAlert('در مجموع حداکثر 3 عکس می‌توانید داشته باشید.', 'خطا');
            DOMElements.addForm.images.value = ''; 
            return;
        }

        preview.querySelectorAll('img:not([data-existing="true"])').forEach(wrapper => wrapper.remove());
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                wrapper.appendChild(img);
                preview.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    },
    
    handleBedroomCheckbox(DOMElements) {
        const { hasBedroom, bedroomCountMain, bedroomsContainer } = DOMElements.addForm;
        bedroomCountMain.disabled = !hasBedroom.checked;
        if (!hasBedroom.checked) {
            bedroomCountMain.value = '';
            bedroomsContainer.innerHTML = '';
        } else if (bedroomCountMain.value > 0) {
            this.generateBedroomFields(parseInt(bedroomCountMain.value), DOMElements);
        }
    },
    
    handleBedroomCountInput(DOMElements) {
        const { bedroomCountMain } = DOMElements.addForm;
        const count = parseInt(bedroomCountMain.value);
        if (count > 0 && count <= 10) {
            this.generateBedroomFields(count, DOMElements);
        } else {
            DOMElements.addForm.bedroomsContainer.innerHTML = '';
        }
    },
    
    generateBedroomFields(count, DOMElements) {
        const container = DOMElements.addForm.bedroomsContainer;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const uniqueId = `master-bedroom-${Date.now()}-${i}`;
            container.innerHTML += `
                <div class="bedroom-input-group">
                    <label>خواب ${i + 1}:</label>
                    <input type="number" class="bedroom-area-input" placeholder="متراژ">
                    <div class="checkbox-container" style="margin-bottom: 0;">
                        <label class="checkbox path">
                            <input type="checkbox" id="${uniqueId}" class="bedroom-master-input">
                            <svg viewBox="0 0 21 21"><path d="M5,10.75 L8.5,14.25 L19.4,2.3 C18.8333333,1.43333333 18.0333333,1 17,1 L4,1 C2.35,1 1,2.35 1,4 L1,17 C1,18.65 20,18.65 20,17 L20,7.99769186"></path></svg>
                        </label>
                        <label for="${uniqueId}">مستر</label>
                    </div>
                </div>
            `;
        }
    }
};