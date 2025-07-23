(function() {
    const plansContainer = document.getElementById('plans-container');
    const logoutBtn = document.getElementById('logout-btn');

    async function fetchPlans() {
        try {
            const response = await fetch('/api/subscriptions/plans');
            if (!response.ok) throw new Error('خطا در دریافت لیست پلن‌ها');
            const plans = await response.json();
            renderPlans(plans);
        } catch (error) {
            plansContainer.innerHTML = `<p style="color:var(--danger-color);">${error.message}</p>`;
        }
    }
    
    function renderPlans(plans) {
        plansContainer.innerHTML = '';
        plans.forEach(plan => {
            const card = document.createElement('div');
            card.className = 'plan-card';
            card.innerHTML = `
                <h3>${plan.name}</h3>
                <div class="price">${plan.price.toLocaleString('fa-IR')} <span>تومان</span></div>
                <button class="secondary purchase-btn" data-plan-id="${plan.id}">انتخاب و پرداخت</button>
            `;
            plansContainer.appendChild(card);
        });

        document.querySelectorAll('.purchase-btn').forEach(button => {
            button.addEventListener('click', handlePurchase);
        });
    }

    async function handlePurchase(event) {
        const planId = event.target.dataset.planId;
        event.target.disabled = true;
        event.target.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const response = await fetch('/api/subscriptions/renew', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ planId: planId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'خطا در فرآیند تمدید');

            alert('اشتراک شما با موفقیت تمدید شد! لطفاً مجدداً وارد شوید.');
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login';

        } catch (error) {
            alert(`خطا: ${error.message}`);
            event.target.disabled = false;
            event.target.innerHTML = 'انتخاب و پرداخت';
        }
    }

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    });
    
    document.addEventListener('DOMContentLoaded', fetchPlans);
})();   