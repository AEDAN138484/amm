// src/api/subscription/subscription.controller.js
const pool = require('../../config/db');

const getSubscriptionPlans = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, price, duration_months FROM subscription_plans ORDER BY duration_months');
        const plans = result.rows.map(plan => ({
            id: plan.id,
            name: plan.name,
            price: plan.price,
            durationMonths: plan.duration_months
        }));
        res.json(plans);
    } catch (err) {
        console.error('Error fetching subscription plans:', err);
        res.status(500).json({ error: 'خطا در دریافت لیست پلن‌ها' });
    }
};

const renewSubscription = async (req, res) => {
    const { planId } = req.body;
    const agencyId = req.session.agency_id;

    if (!planId) {
        return res.status(400).json({ error: 'شناسه پلن ارسال نشده است.' });
    }

    try {
        const planResult = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
        const selectedPlan = planResult.rows[0];

        if (!selectedPlan) {
            return res.status(400).json({ error: 'پلن انتخاب شده معتبر نیست.' });
        }

        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + selectedPlan.duration_months);

        await pool.query(
            'UPDATE agencies SET status = $1, subscription_end_date = $2, subscription_type = $3 WHERE id = $4',
            ['active', newEndDate, selectedPlan.id, agencyId]
        );

        res.json({ success: true, message: 'اشتراک با موفقیت تمدید شد.' });

    } catch (err) {
        console.error('Error renewing subscription:', err);
        res.status(500).json({ error: 'خطای سرور در تمدید اشتراک.' });
    }
};

module.exports = {
    getSubscriptionPlans,
    renewSubscription,
};