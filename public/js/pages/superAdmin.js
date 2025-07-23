(function() {
    let userRole = null;
    const subscriptionTypes = { "1_month": "۱ ماهه", "3_months": "۳ ماهه", "6_months": "۶ ماهه", "1_year": "۱ ساله" };
    const statuses = { "active": "فعال", "inactive": "غیر فعال", "pending": "در حال انجام" };

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
    
    async function initializePage() {
        const response = await fetch('/api/session-info');
        const session = await response.json();
        userRole = session.role;
        
        if (userRole === 'super_admin') {
            document.querySelectorAll('.super-admin-only').forEach(el => el.style.display = 'block');
            fetchSupportAdmins();
        }
        
        fetchAgencies();
    }

    async function fetchAgencies() {
        try {
            const response = await fetch('/api/super/agencies');
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات');
            renderAgenciesTable(await response.json());
        } catch (error) {
            document.getElementById('agencies-tbody').innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">${error.message}</td></tr>`;
        }
    }
    
    function renderAgenciesTable(agencies) {
        const tbody = document.getElementById('agencies-tbody');
        tbody.innerHTML = agencies.length === 0 ? `<tr><td colspan="6" style="text-align:center;">هیچ بنگاهی یافت نشد.</td></tr>` : '';

        agencies.forEach(agency => {
            const tr = document.createElement('tr');
            tr.dataset.agencyId = agency.id;
            tr.dataset.adminUserId = agency.admin_user_id;

            const subscriptionEndDate = agency.subscription_end_date ? new Date(agency.subscription_end_date).toLocaleDateString('fa-IR') : '---';
            const subOptions = Object.entries(subscriptionTypes).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
            const statusOptions = Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${agency.status === k ? 'selected' : ''}>${v}</option>`).join('');

            const deleteButtonHtml = userRole === 'super_admin' ?
                `<button class="small delete delete-btn" title="حذف بنگاه"><i class="fas fa-trash"></i></button>` :
                `<button class="small delete" title="حذف بنگاه" disabled><i class="fas fa-trash"></i></button>`;

            tr.innerHTML = `
                <td>
                    <input type="text" class="form-control name-input" value="${agency.name || ''}" placeholder="نام بنگاه">
                    <input type="text" class="form-control address-input" value="${agency.address || ''}" placeholder="آدرس" style="margin-top:5px;">
                </td>
                <td>
                    <input type="text" class="form-control username-input" value="${agency.admin_username || ''}" ${!agency.admin_user_id ? 'disabled' : ''}>
                </td>
                <td><select class="form-control status-select">${statusOptions}</select></td>
                <td>
                    <select class="form-control sub-type-select">
                        <option value="">${subscriptionTypes[agency.subscription_type] || '---'}</option>
                        ${subOptions}
                    </select>
                </td>
                <td>${subscriptionEndDate}</td>
                <td class="actions-cell">
                    <button class="small secondary save-btn" title="ذخیره تغییرات"><i class="fas fa-save"></i></button>
                    <button class="small edit change-pass-btn" title="تغییر رمز مدیر"><i class="fas fa-key"></i></button>
                    ${deleteButtonHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.querySelectorAll('.save-btn').forEach(btn => btn.addEventListener('click', handleSave));
        document.querySelectorAll('.change-pass-btn').forEach(btn => btn.addEventListener('click', openPasswordModal));
        if (userRole === 'super_admin') {
            document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
        }
    }
    
    async function handleSave(event) {
        const tr = event.target.closest('tr');
        const agencyId = tr.dataset.agencyId;
        const payload = {
            name: tr.querySelector('.name-input').value,
            address: tr.querySelector('.address-input').value,
            status: tr.querySelector('.status-select').value,
            subscription_type: tr.querySelector('.sub-type-select').value,
            admin_username: tr.querySelector('.username-input').value,
            admin_user_id: tr.dataset.adminUserId,
        };
        
        try {
            const response = await fetch(`/api/super/agencies/${agencyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در ذخیره');
            await showCustomAlert('تغییرات با موفقیت ذخیره شد.', 'موفق');
            fetchAgencies();
        } catch (error) {
            await showCustomAlert(`خطا: ${error.message}`, 'خطا');
        }
    }

    async function handleCreateAgency(event) {
        event.preventDefault();
        const form = document.getElementById('add-agency-form');
        const payload = {
            name: document.getElementById('new-agency-name').value,
            address: document.getElementById('new-agency-address').value,
            subscription_type: document.getElementById('new-subscription-type').value,
            admin_username: document.getElementById('new-admin-username').value,
            admin_password: document.getElementById('new-admin-password').value
        };

        try {
            const response = await fetch('/api/super/agencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در ایجاد بنگاه');
            await showCustomAlert(result.message, 'موفق');
            form.reset();
            fetchAgencies();
        } catch (error) {
            await showCustomAlert(`خطا: ${error.message}`, 'خطا');
        }
    }

    async function handleDelete(event) {
        const tr = event.target.closest('tr');
        const agencyId = tr.dataset.agencyId;
        const agencyName = tr.querySelector('.name-input').value;

        const confirmed = await showCustomConfirm(`آیا از حذف کامل بنگاه "${agencyName}" و تمام اطلاعات آن (املاک و کاربران) مطمئن هستید؟ این عمل غیرقابل بازگشت است.`, 'تایید حذف');
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/super/agencies/${agencyId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در حذف');
            await showCustomAlert(result.message, 'موفق');
            fetchAgencies();
        } catch (error) {
             await showCustomAlert(`خطا: ${error.message}`, 'خطا');
        }
    }
    
    function openPasswordModal(event) {
        const tr = event.target.closest('tr');
        const modal = document.getElementById('password-modal');
        if(!tr.dataset.adminUserId) {
            showCustomAlert('کاربر مدیری برای این بنگاه یافت نشد.', 'خطا');
            return;
        }
        modal.querySelector('#modal-username').textContent = tr.querySelector('.username-input').value;
        modal.querySelector('#modal-new-password').value = '';
        modal.dataset.userId = tr.dataset.adminUserId;
        modal.classList.add('active');
    }

    function closePasswordModal() { document.getElementById('password-modal').classList.remove('active'); }
    
    async function handlePasswordChange() {
        const modal = document.getElementById('password-modal');
        const userId = modal.dataset.userId;
        const newPassword = document.getElementById('modal-new-password').value;
        if (!newPassword) {
            await showCustomAlert('لطفا رمز عبور جدید را وارد کنید.', 'خطا');
            return;
        }
        try {
            const response = await fetch(`/api/super/users/${userId}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_password: newPassword }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در تغییر رمز');
            await showCustomAlert(result.message, 'موفق');
            closePasswordModal();
        } catch (error) {
            await showCustomAlert(`خطا: ${error.message}`, 'خطا');
        }
    }
    
    async function handleSuperAdminChangeCredentials(event) {
        event.preventDefault();
        const form = document.getElementById('super-admin-credentials-form');
        const payload = {
            currentPassword: form.querySelector('#current-password').value,
            newUsername: form.querySelector('#new-super-admin-username').value,
            newPassword: form.querySelector('#new-super-admin-password').value,
        };

        if (!payload.currentPassword || !payload.newUsername || !payload.newPassword) {
            await showCustomAlert('تمام فیلدها باید پر شوند.', 'خطا');
            return;
        }

        try {
            const response = await fetch('/api/super/change-credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در به‌روزرسانی');
            await showCustomAlert(result.message, 'موفق');
            form.reset();
        } catch(error) {
            await showCustomAlert(`خطا: ${error.message}`, 'خطا');
        }
    }

    async function fetchSupportAdmins() {
        const tbody = document.getElementById('admins-tbody');
        try {
            const response = await fetch('/api/super/admins');
            if (!response.ok) throw new Error('خطا در دریافت لیست ادمین‌ها');
            const admins = await response.json();
            tbody.innerHTML = '';
            admins.forEach(admin => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${admin.username}</td>
                    <td>${admin.role === 'super_admin' ? 'زوپر ادمین' : 'سوپر ادمین'}</td>
                    <td class="actions-cell">
                        <button class="small delete delete-admin-btn" data-id="${admin.id}" ${admin.role === 'super_admin' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            document.querySelectorAll('.delete-admin-btn').forEach(btn => btn.addEventListener('click', handleDeleteSupportAdmin));
        } catch (error) {
           tbody.innerHTML = `<tr><td colspan="3">${error.message}</td></tr>`;
        }
    }
    
    async function handleCreateSupportAdmin(event) {
        event.preventDefault();
        const form = document.getElementById('add-support-admin-form');
        const payload = {
            username: form.querySelector('#support-username').value,
            password: form.querySelector('#support-password').value
        };
        try {
             const response = await fetch('/api/super/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
             const result = await response.json();
             if (!response.ok) throw new Error(result.error || 'خطا در ساخت کاربر');
             await showCustomAlert('کاربر سوپر ادمین با موفقیت ایجاد شد.', 'موفق');
             form.reset();
             fetchSupportAdmins();
        } catch(error) {
            await showCustomAlert(error.message, 'خطا');
        }
    }
    
    async function handleDeleteSupportAdmin(event) {
        const btn = event.currentTarget;
        const adminId = btn.dataset.id;
        if (!await showCustomConfirm('آیا از حذف این کاربر سوپر ادمین مطمئن هستید؟')) return;
        try {
            const response = await fetch(`/api/super/admins/${adminId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در حذف');
            fetchSupportAdmins();
        } catch(error) {
            await showCustomAlert(error.message, 'خطا');
        }
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        initializePage();
        document.getElementById('back-to-map-btn').addEventListener('click', () => {
            window.location.href = '/';
        });
        document.getElementById('add-agency-form').addEventListener('submit', handleCreateAgency);
        document.getElementById('modal-save-password-btn').addEventListener('click', handlePasswordChange);
        document.getElementById('modal-cancel-btn').addEventListener('click', closePasswordModal);
        document.getElementById('super-admin-credentials-form').addEventListener('submit', handleSuperAdminChangeCredentials);
        document.getElementById('add-support-admin-form').addEventListener('submit', handleCreateSupportAdmin);
    });
})();