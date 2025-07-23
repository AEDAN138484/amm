const api = {
    async _handleResponse(response) {
        if (response.status === 401) {
            window.location.href = '/login';
            throw new Error('Authentication failed');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.message || errorData.error || `خطای سرور: ${response.status}`;
            const error = new Error(message);
            error.code = errorData.code;
            throw error;
        }

        return await response.json();
    },

    async getSessionInfo() {
        const response = await fetch('/api/session-info');
        return this._handleResponse(response);
    },

    async getAgencyInfo() {
        const response = await fetch('/api/agency-info');
        return this._handleResponse(response);
    },

    async getEstates() {
        const response = await fetch('/api/estates', { headers: { 'Accept': 'application/json' } });
        return this._handleResponse(response);
    },

    async getEstateById(id) {
        const response = await fetch(`/api/estates/${id}`, { headers: { 'Accept': 'application/json' } });
        return this._handleResponse(response);
    },
    
    async submitEstate(formData, editingId) {
        const isEditing = !!editingId;
        const url = isEditing ? `/api/estates/${editingId}` : '/api/estates';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            body: formData,
            headers: { 'Accept': 'application/json' }
        });
        
        return this._handleResponse(response);
    },

    async deleteEstate(id) {
        const response = await fetch(`/api/estates/${id}`, { 
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        return this._handleResponse(response);
    },

    async logout() {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    }
};