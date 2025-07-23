const mapManager = {
    map: null,
    markerClusterGroup: null,
    drawnItems: null,
    tempMarker: null,
    markers: [],
    clearSelectionControl: null,
    quietModeControl: null,

    init(CONFIG, onMapClick, onDraw) {
        this.map = L.map('map', { zoomControl: false }).setView(CONFIG.kermanshahCoords, CONFIG.mapZoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(this.map);
        
        this.markerClusterGroup = L.markerClusterGroup();
        this.map.addLayer(this.markerClusterGroup);

        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        const drawControl = new L.Control.Draw({
            edit: false,
            draw: { 
                polygon: false, polyline: false, circle: false, circlemarker: false, marker: false,
                rectangle: { shapeOptions: { color: '#4C51BF' } }
            }
        });
        this.map.addControl(drawControl);
        
        const drawToolbar = drawControl.getContainer();
        if (drawToolbar) {
            L.DomUtil.removeClass(drawToolbar, 'quiet-mode-toggle-group');
            drawToolbar.querySelectorAll('a.leaflet-draw-draw-rectangle').forEach(btn => {
                L.DomUtil.removeClass(btn, 'quiet-mode-toggle');
                btn.innerHTML = '';
            });
        }

        this.map.on(L.Draw.Event.CREATED, (event) => onDraw(event.layer));

        L.Control.ClearSelection = L.Control.extend({
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-clear-selection-control');
                container.innerHTML = `<a href="#" title="پاک کردن انتخاب"><i class="fas fa-times"></i></a>`;
                container.style.display = 'none';
                L.DomEvent.on(container, 'click', L.DomEvent.stop).on(container, 'click', () => app.resetFilters());
                return container;
            },
            onRemove: (map) => {}
        });
        this.clearSelectionControl = new L.Control.ClearSelection({ position: 'topleft' });
        this.map.addControl(this.clearSelectionControl);

        L.Control.QuietMode = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control quiet-mode-toggle');
                container.innerHTML = `<a href="#" title="حالت خلوت"><i class="fas fa-home"></i></a>`;
                L.DomEvent.on(container, 'click', L.DomEvent.stop).on(container, 'click', () => {
                    app.toggleQuietMode();
                    container.querySelector('a').classList.toggle('active');
                });
                return container;
            },
            onRemove: (map) => {}
        });
        this.quietModeControl = new L.Control.QuietMode({ position: 'topleft' });
        this.map.addControl(this.quietModeControl);

        this.map.on('click', onMapClick);
    },

    createPopupContentHTML(estate, CONFIG) {
        const typeInfo = CONFIG.propertyTypes[estate.type] || { text: 'نامشخص' };
        const dealText = CONFIG.dealTypes[estate.dealType] || 'نامشخص';
        const photoIndicator = (estate.images && estate.images.length > 0)
            ? `<i class="fas fa-camera" style="color: var(--secondary-color); font-size: 0.8em; vertical-align: middle; margin-left: 5px;"></i>`
            : '';

        return `
            <div class="estate-popup">
                <div class="popup-header"><span class="estate-title">${photoIndicator}${estate.title || 'بدون عنوان'}</span></div>
                <div class="popup-row"><span>نوع - معامله:</span><span>${typeInfo.text} - ${dealText}</span></div>
                <div class="popup-row"><span>مالک:</span><span>${estate.owner || '---'} (${estate.phone || '---'})</span></div>
                <div class="popup-row"><span>قیمت:</span><span>${(estate.totalPrice || 0).toLocaleString('fa-IR')} تومان</span></div>
                <div class="popup-row"><span>متراژ:</span><span>${estate.builtArea || '---'} متر</span></div>
                <div class="popup-row"><span>آدرس:</span><span>${estate.address || 'نامشخص'}</span></div>
                <div class="popup-actions-reverted">
                    <button class="delete popup-action-btn" data-action="delete" data-id="${estate.id}"><i class="fas fa-trash"></i> حذف</button>
                    <button class="edit popup-action-btn" data-action="edit" data-id="${estate.id}"><i class="fas fa-edit"></i> ویرایش</button>
                    <button class="secondary popup-action-btn" data-action="details" data-id="${estate.id}"><i class="fas fa-info-circle"></i> جزئیات</button>
                </div>
            </div>`;
    },

    updateMarkers(estates, CONFIG) {
        this.markerClusterGroup.clearLayers();
        this.markers = [];
        estates.forEach(estate => {
            if (!estate.location) return;

            const typeInfo = CONFIG.propertyTypes[estate.type];
            const markerColor = typeInfo ? typeInfo.color : '#666';
            const marker = L.marker(estate.location, {
                icon: L.divIcon({
                    className: 'estate-marker',
                    html: `<div style="background: ${markerColor};">${(typeInfo?.text || '؟').charAt(0)}</div>`,
                    iconSize: [24, 24]
                })
            });
            marker.bindPopup(() => this.createPopupContentHTML(estate, CONFIG), { minWidth: 280 });

            this.markerClusterGroup.addLayer(marker);
            this.markers.push({ id: estate.id, marker });
        });
    },

    addTempMarker(latlng, onDragEnd) {
        if (this.tempMarker) this.map.removeLayer(this.tempMarker);
        this.tempMarker = L.marker(latlng, { 
            draggable: true,
            icon: L.divIcon({ 
                className: 'temp-marker',
                html: '<i class="fas fa-map-marker-alt"></i>',
                iconSize: [45, 45]
            }) 
        }).addTo(this.map);
        this.tempMarker.on('dragend', (event) => onDragEnd(event.target.getLatLng()));
        return this.tempMarker.getLatLng();
    },

    removeTempMarker() {
        if (this.tempMarker) {
            this.map.removeLayer(this.tempMarker);
            this.tempMarker = null;
        }
    },
    
    zoomToMarker(estateId) {
        const markerData = this.markers.find(m => m.id == estateId);
        if (markerData?.marker) {
            this.markerClusterGroup.zoomToShowLayer(markerData.marker, () => {
                markerData.marker.openPopup();
            });
        }
    },

    clearDrawings() {
        if(this.drawnItems) this.drawnItems.clearLayers();
        if(this.clearSelectionControl) this.clearSelectionControl.getContainer().style.display = 'none';
    }
};