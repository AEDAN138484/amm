const ui = {
    spinner: document.getElementById('spinner-overlay'),
    
    showSpinner() {
        if (this.spinner) this.spinner.style.display = 'flex';
    },

    hideSpinner() {
        if (this.spinner) this.spinner.style.display = 'none';
    },

    showCustomAlert(message, title = 'پیام', buttonText = 'تایید', buttonCallback = null) {
        const modal = document.getElementById('custom-alert-modal');
        const buttonsContainer = modal.querySelector('.custom-modal-buttons');
        document.getElementById('custom-alert-title').textContent = title;
        document.getElementById('custom-alert-message').textContent = message;
        buttonsContainer.innerHTML = `<button class="confirm-btn" id="custom-alert-ok-btn">${buttonText}</button>`;
        modal.classList.add('active');
        return new Promise(resolve => {
            const okBtn = document.getElementById('custom-alert-ok-btn');
            okBtn.onclick = async () => {
                modal.classList.remove('active');
                if (buttonCallback) {
                    await buttonCallback();
                }
                resolve();
            };
        });
    },

    showCustomConfirm(message, title = 'تایید') {
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
    },

    numToPersian(num) {
        if (num === null || num === undefined || num === '') return '';
        let str = String(num).trim().replace(/,/g, '');
        if (str === '0') return 'صفر';
        if (!/^\d+$/.test(str)) return '';

        const yekan = ["یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
        const dahgan = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
        const sadgan = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
        const dah = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];

        const get3digits = (n) => {
            let output = "";
            let len = n.length;
            if (len === 3) {
                let s = n.substr(0, 1);
                let d = n.substr(1, 2);
                if (s != '0') output += sadgan[s];
                if (d != '00') {
                    if (s != '0') output += " و ";
                    output += get2digits(d);
                }
            } else if (len === 2) {
                output = get2digits(n);
            } else if (len === 1) {
                if (n != '0') output = yekan[n - 1];
            }
            return output;
        }

        const get2digits = (n) => {
            if (n[0] == '0') return yekan[n[1] - 1];
            if (n[0] == '1') return dah[n[1]];
            const d = dahgan[n[0]];
            const y = n[1] == '0' ? '' : " و " + yekan[n[1] - 1];
            return d + y;
        }
        
        if (str.length > 15) return 'عدد بسیار بزرگ';
        
        const parts = [];
        const base = ["", " هزار", " میلیون", " میلیارد", " تریلیون"];
        let i = 0;
        while(str.length > 0) {
            let temp = str.length > 3 ? str.substr(str.length - 3, 3) : str;
            str = str.length > 3 ? str.slice(0, -3) : "";
            let p = get3digits(temp);
            if (p) parts.unshift(p + base[i]);
            i++;
        }
        return parts.join(" و ");
    },

    updatePriceWords(inputEl, wordsEl) {
        if (!inputEl || !wordsEl) return;
        const numberStr = inputEl.value;
        wordsEl.style.color = 'var(--success-color)';

        if (!numberStr || isNaN(String(numberStr).replace(/,/g, ''))) {
            wordsEl.textContent = '';
            return;
        }
        
        const result = this.numToPersian(numberStr);
        if (result && result !== 'عدد بسیار بزرگ') {
            wordsEl.textContent = result + ' تومان';
        } else if (result === 'عدد بسیار بزرگ') {
             wordsEl.textContent = 'عدد وارد شده بسیار بزرگ است.';
             wordsEl.style.color = 'var(--danger-color)';
        } else {
            wordsEl.textContent = '';
        }
    },
    
    toggleControlPanel(panel, toggleButton) {
        panel.classList.toggle('hidden');
        toggleButton.innerHTML = panel.classList.contains('hidden') ? '<i class="fas fa-bars"></i>' : '<i class="fas fa-times"></i>';
    },

    async handleTabClick(event, appState, DOMElements, CONFIG) {
        const clickedTab = event.currentTarget;
        if (appState.editingEstateId && clickedTab.dataset.tab !== 'add') {
            const confirmed = await this.showCustomConfirm('شما در حال ویرایش یک ملک هستید. آیا می‌خواهید بدون ذخیره خارج شوید؟', 'تایید خروج');
            if (!confirmed) return;
            form.reset(appState, DOMElements, false);
        }
        DOMElements.tabs.forEach(t => t.classList.remove('active'));
        clickedTab.classList.add('active');
        DOMElements.tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(clickedTab.dataset.tab + '-tab')?.classList.add('active');
        if (clickedTab.dataset.tab === 'stats') this.updateCharts(appState, CONFIG);

        if (clickedTab.dataset.tab !== 'add' && mapManager.tempMarker) {
            mapManager.removeTempMarker();
            appState.selectedLocation = null;
        }
    },

    setCurrentDate(dateElement) {
        try {
            const today = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = new Intl.DateTimeFormat('fa-IR-u-nu-latn', options).format(today);
        } catch (e) {
            dateElement.textContent = new Date().toLocaleDateString('fa-IR');
        }
    },
    
    showRelevantFields(selectedType, DOMElements) {
        const visibilityMap = {
            apartment: ['all', 'apartment'],
            villa: ['all', 'villa'],
            office: ['all', 'office'],
            store: ['all', 'store'],
            land: ['all', 'land'],
            old: ['all', 'old', 'land']
        };

        const allowedClasses = visibilityMap[selectedType] || ['all'];

        DOMElements.addForm.categoryFields.forEach(fieldDiv => {
            const fieldClasses = Array.from(fieldDiv.classList);
            const isVisible = fieldClasses.some(cls => allowedClasses.includes(cls));
            fieldDiv.style.display = isVisible ? 'block' : 'none';
        });
        
        const builtAreaGroup = DOMElements.addForm.builtArea.closest('.form-group');
        if (builtAreaGroup) {
            builtAreaGroup.style.display = (selectedType === 'land') ? 'none' : 'block';
        }
    },

    updateCharts(appState, CONFIG) {
        if (!window.Chart || !CONFIG) return;
        const typeCtx = document.getElementById('estate-type-stats')?.getContext('2d');
        const priceCtx = document.getElementById('price-stats')?.getContext('2d');
        if (!typeCtx || !priceCtx) return;

        const chartOptions = {
            responsive: true, maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: true, ticks: { color: 'var(--text-color)' } },
                x: { ticks: { color: 'var(--text-color)' } }
            },
            plugins: { legend: { labels: { color: 'var(--text-color)', font: { family: "'Segoe UI', Tahoma" } } } }
        };

        const labels = Object.values(CONFIG.propertyTypes).map(p => p.text);
        const colors = Object.values(CONFIG.propertyTypes).map(p => p.color);
        const typeCounts = Object.keys(CONFIG.propertyTypes).map(type => appState.estates.filter(e => e.type === type).length);
        const avgPrices = Object.keys(CONFIG.propertyTypes).map(type => {
            const typeEstates = appState.estates.filter(e => e.type === type && e.totalPrice > 0);
            return typeEstates.length === 0 ? 0 : Math.round(typeEstates.reduce((sum, e) => sum + e.totalPrice, 0) / typeEstates.length);
        });

        if (appState.estateTypeChart) appState.estateTypeChart.destroy();
        appState.estateTypeChart = new Chart(typeCtx, { type: 'bar', data: { labels, datasets: [{ label: 'تعداد املاک', data: typeCounts, backgroundColor: colors }] }, options: chartOptions });

        if (appState.priceStatsChart) appState.priceStatsChart.destroy();
        appState.priceStatsChart = new Chart(priceCtx, { type: 'bar', data: { labels, datasets: [{ label: 'میانگین قیمت (تومان)', data: avgPrices, backgroundColor: colors }] }, options: chartOptions });
    }
};