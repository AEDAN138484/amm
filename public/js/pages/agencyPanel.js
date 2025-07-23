(function() {
    const dealTypeTranslations = { 'pre-sale': 'پیش فروش', sale: 'فروش', mortgage: 'رهن', rent: 'اجاره' };
    const logIcons = {
        CREATE_ESTATE: 'fa-plus-circle',
        UPDATE_ESTATE: 'fa-edit',
        DELETE_ESTATE: 'fa-trash-alt',
        CREATE_USER: 'fa-user-plus',
        DELETE_USER: 'fa-user-minus',
        DEFAULT: 'fa-info-circle'
    };

    function showCustomAlert(message, title = 'پیام') {
        const modal = document.getElementById('custom-alert-modal');
        modal.querySelector('#custom-alert-title').textContent = title;
        modal.querySelector('#custom-alert-message').textContent = message;
        modal.querySelector('.custom-modal-buttons').innerHTML = `<button class="confirm-btn" id="custom-alert-ok-btn">تایید</button>`;
        modal.classList.add('active');
        return new Promise(resolve => {
            document.getElementById('custom-alert-ok-btn').onclick = () => {
                modal.classList.remove('active');
                resolve(true);
            };
        });
    }

    function showCustomConfirm(message, title = 'تایید') {
        const modal = document.getElementById('custom-alert-modal');
        modal.querySelector('#custom-alert-title').textContent = title;
        modal.querySelector('#custom-alert-message').textContent = message;
        modal.querySelector('.custom-modal-buttons').innerHTML = `
            <button class="confirm-btn" id="custom-confirm-yes-btn">بله، حذف کن</button>
            <button class="cancel-btn" id="custom-confirm-no-btn">خیر</button>`;
        modal.classList.add('active');
        return new Promise(resolve => {
            document.getElementById('custom-confirm-yes-btn').onclick = () => { modal.classList.remove('active'); resolve(true); };
            document.getElementById('custom-confirm-no-btn').onclick = () => { modal.classList.remove('active'); resolve(false); };
        });
    }
    
    async function fetchStats() {
        try {
            const response = await fetch('/api/agency/stats');
             if (!response.ok) throw new Error('خطا در دریافت آمار');
             const stats = await response.json();
             displayStats(stats);
        } catch (error) {
            console.error("Stat fetch error:", error);
        }
    }
    
    async function fetchLogs() {
         try {
            const response = await fetch('/api/agency/logs');
             if (!response.ok) throw new Error('خطا در دریافت لاگ‌ها');
             const logs = await response.json();
             displayLogs(logs);
        } catch (error) {
            document.getElementById('logs-container').innerHTML = `<p style="color:var(--danger-color); text-align:center;">${error.message}</p>`;
        }
    }

    function displayStats(stats) {
        document.getElementById('total-estates-stat').textContent = stats.totalEstates || 0;
        document.getElementById('featured-estates-stat').textContent = stats.featuredEstates || 0;
        
        let topDealType = '-';
        if(stats.byDealType && stats.byDealType.length > 0){
            const sortedDeals = [...stats.byDealType].sort((a,b) => b.count - a.count);
            topDealType = dealTypeTranslations[sortedDeals[0].dealType] || '-';
        }
        document.getElementById('top-deal-type-stat').textContent = topDealType;
    }
    
    function displayLogs(logs) {
        const container = document.getElementById('logs-container');
        container.innerHTML = logs.length > 0 ? '' : '<p style="text-align:center;">فعالیتی برای نمایش وجود ندارد.</p>';

        logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            const iconClass = logIcons[log.action_type] || logIcons.DEFAULT;
            const logDate = new Date(log.timestamp).toLocaleString('fa-IR');
            
            logItem.innerHTML = `
                <div class="log-icon"><i class="fas ${iconClass}"></i></div>
                <div class="log-details">
                    <p>${log.details}</p>
                    <span>توسط: ${log.username || 'سیستم'} - در تاریخ: ${logDate}</span>
                </div>
            `;
            container.appendChild(logItem);
        });
    }

    async function fetchUsers() {
        try {
            const response = await fetch('/api/agency/users');
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات کاربران');
            renderTable(await response.json());
        } catch (error) {
            document.getElementById('users-tbody').innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--danger-color);">${error.message}</td></tr>`;
        }
    }

    function renderTable(users) {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = users.length === 0 ? `<tr><td colspan="3" style="text-align:center;">هیچ کاربری یافت نشد.</td></tr>` : '';

        const roleNames = { 'agency_admin': 'مدیر بنگاه', 'agent': 'مشاور' };

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.dataset.userId = user.id;

            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${roleNames[user.role] || user.role}</td>
                <td class="actions-cell">
                    <button class="small delete delete-btn" ${user.role === 'agency_admin' ? 'disabled' : ''} title="حذف کاربر"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
    }
    
    async function handleCreateUser(event) {
        event.preventDefault();
        const form = document.getElementById('add-user-form');
        const payload = {
            username: document.getElementById('new-username').value,
            password: document.getElementById('new-password').value,
        };

        try {
            const response = await fetch('/api/agency/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در ایجاد کاربر');
            await showCustomAlert(result.message, 'موفق');
            form.reset();
            fetchUsers();
            fetchLogs();
        } catch (error) {
            await showCustomAlert(`خطا: ${error.message}`, 'خطا');
        }
    }

    async function handleDelete(event) {
        const tr = event.target.closest('tr');
        const userId = tr.dataset.userId;
        
        const confirmed = await showCustomConfirm(`آیا از حذف این کاربر مطمئن هستید؟`, 'تایید حذف');
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/agency/users/${userId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در حذف');
            await showCustomAlert(result.message, 'موفق');
            fetchUsers();
            fetchLogs();
        } catch (error) {
             await showCustomAlert(`خطا: ${error.message}`, 'خطا');
        }
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        fetchUsers();
        fetchStats();
        fetchLogs();
        document.getElementById('back-to-map-btn').addEventListener('click', () => {
            window.location.href = '/';
        });
        document.getElementById('add-user-form').addEventListener('submit', handleCreateUser);
    });
})();