const pool = require('../../config/db');

const calculateEndDate = (subscriptionType) => {
    const date = new Date();
    const months = { '1_month': 1, '3_months': 3, '6_months': 6, '1_year': 12 };
    if (months[subscriptionType]) {
        date.setMonth(date.getMonth() + months[subscriptionType]);
        return date;
    }
    return null;
}

const getAgencies = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, u.id as admin_user_id, u.username as admin_username
            FROM agencies a
            LEFT JOIN users u ON a.id = u.agency_id AND u.role = 'agency_admin'
            ORDER BY a.id
        `);
        res.json(result.rows);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'خطا در دریافت لیست بنگاه‌ها' });
    }
};

const createAgency = async (req, res) => {
    const { name, address, subscription_type, admin_username, admin_password } = req.body;
    if (!name || !subscription_type || !admin_username || !admin_password) {
        return res.status(400).json({ error: 'تمام فیلدها الزامی هستند.' });
    }
    
    const subscriptionTypeMap = {
        "1_month": 1,
        "3_months": 2,
        "6_months": 3,
        "1_year": 4
    };
    const subscriptionTypeId = subscriptionTypeMap[subscription_type];

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const subscription_end_date = calculateEndDate(subscription_type);
        if (!subscription_end_date || !subscriptionTypeId) return res.status(400).json({error: 'نوع اشتراک نامعتبر است.'});

        const agencyResult = await client.query(
            'INSERT INTO agencies (name, address, status, subscription_end_date, subscription_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, address, 'active', subscription_end_date, subscriptionTypeId]
        );
        const newAgencyId = agencyResult.rows[0].id;

        await client.query(
            'INSERT INTO users (username, password, role, agency_id) VALUES ($1, $2, $3, $4)',
            [admin_username, admin_password, 'agency_admin', newAgencyId]
        );

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'بنگاه و مدیر آن با موفقیت ایجاد شدند.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error creating agency:", err);
        if (err.code === '23505') return res.status(409).json({ error: 'نام کاربری مدیر تکراری است.' });
        res.status(500).json({ error: 'خطا در ایجاد بنگاه جدید.' });
    } finally {
        client.release();
    }
};

const updateAgency = async (req, res) => {
    if (parseInt(req.params.id, 10) === 1) {
        return res.status(403).json({ error: 'ویرایش بنگاه اصلی سیستم امکان‌پذیر نیست.' });
    }
    const { name, address, status, subscription_type, admin_username, admin_user_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const agency = await client.query('SELECT * from agencies WHERE id = $1', [req.params.id]);
        if(agency.rows.length === 0) throw new Error('بنگاه یافت نشد');
        
        let new_subscription_end_date = agency.rows[0].subscription_end_date;
        let new_subscription_type_id = agency.rows[0].subscription_type;

        if(subscription_type){
            const subscriptionTypeMap = {
                "1_month": 1,
                "3_months": 2,
                "6_months": 3,
                "1_year": 4
            };
            new_subscription_type_id = subscriptionTypeMap[subscription_type];
            new_subscription_end_date = calculateEndDate(subscription_type);
        }

        await client.query(
            'UPDATE agencies SET name = $1, address = $2, status = $3, subscription_type = $4, subscription_end_date = $5 WHERE id = $6',
            [name, address, status, new_subscription_type_id, new_subscription_end_date, req.params.id]
        );

        if (admin_user_id && admin_username) {
            await client.query(
                'UPDATE users SET username = $1 WHERE id = $2',
                [admin_username, admin_user_id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error updating agency:", err);
        if (err.code === '23505') return res.status(409).json({ error: 'نام کاربری تکراری است.' });
        res.status(500).json({ error: 'خطا در به‌روزرسانی بنگاه' });
    } finally {
        client.release();
    }
};

const deleteAgency = async (req, res) => {
    if (parseInt(req.params.id, 10) === 1) {
        return res.status(403).json({ error: 'حذف بنگاه اصلی سیستم امکان‌پذیر نیست.' });
    }
    try {
        const result = await pool.query('DELETE FROM agencies WHERE id = $1', [req.params.id]);
        if(result.rowCount === 0) return res.status(404).json({ error: 'بنگاه یافت نشد' });
        res.json({ success: true, message: 'بنگاه و تمام اطلاعات آن حذف شد.' });
    } catch (err) {
        console.error("Error deleting agency:", err);
        res.status(500).json({ error: 'خطا در حذف بنگاه.' });
    }
};

const changeUserPassword = async (req, res) => {
    const { new_password } = req.body;
    if(!new_password) return res.status(400).json({ error: 'رمز عبور جدید الزامی است.' });

    try {
        const result = await pool.query('UPDATE users SET password = $1 WHERE id = $2', [new_password, req.params.userId]);
        if(result.rowCount === 0) return res.status(404).json({ error: 'کاربر یافت نشد.' });
        res.json({success: true, message: 'رمز عبور با موفقیت تغییر کرد.'});
    } catch (err) {
        console.error("Error changing password:", err);
        res.status(500).json({ error: 'خطا در تغییر رمز عبور.' });
    }
};

const changeSuperAdminCredentials = async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    if (!currentPassword || !newUsername || !newPassword) {
        return res.status(400).json({ error: 'تمام فیلدها الزامی است' });
    }
    
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];

        if (currentPassword !== user.password) {
            return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
        }
        
        await pool.query('UPDATE users SET username = $1, password = $2 WHERE id = $3', [newUsername, newPassword, user.id]);
        res.json({ success: true, message: 'مشخصات شما با موفقیت به‌روز شد.' });
    } catch (err) {
        console.error("Error changing credentials:", err);
        if (err.code === '23505') return res.status(409).json({ error: 'این نام کاربری قبلا استفاده شده است.' });
        res.status(500).json({ error: 'خطا در به‌روزرسانی اطلاعات' });
    }
};

const getManagementUsers = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, role FROM users WHERE role = 'support_admin' OR (role = 'super_admin' AND id != $1)", [req.session.userId]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error getting management users:", err);
        res.status(500).json({ error: "خطا در دریافت لیست ادمین‌ها" });
    }
};

const createSupportAdmin = async (req, res) => {
    const { username, password } = req.body;
    try {
        await pool.query("INSERT INTO users (username, password, role, agency_id) VALUES ($1, $2, 'support_admin', 1)", [username, password]);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Error creating support admin:", err);
        if (err.code === '23505') return res.status(409).json({ error: 'نام کاربری تکراری است' });
        res.status(500).json({ error: 'خطا در ساخت ادمین پشتیبانی' });
    }
};

const deleteSupportAdmin = async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id = $1 AND role = 'support_admin'", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting support admin:", err);
        res.status(500).json({ error: 'خطا در حذف ادمین پشتیبانی' });
    }
};

module.exports = {
    getAgencies,
    createAgency,
    updateAgency,
    deleteAgency,
    changeUserPassword,
    changeSuperAdminCredentials,
    getManagementUsers,
    createSupportAdmin,
    deleteSupportAdmin
};