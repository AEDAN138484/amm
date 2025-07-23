const pool = require('../../config/db');
const { logActivity } = require('../../utils/logger');

const getAgencyUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role FROM users WHERE agency_id = $1 ORDER BY role, username', [req.session.agency_id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
    }
};

const createAgencyUser = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
    }
    try {
        const newUserRole = req.session.agency_id === 1 ? 'support_admin' : 'agent';

        await pool.query(
            "INSERT INTO users (username, password, role, agency_id) VALUES ($1, $2, $3, $4)",
            [username, password, newUserRole, req.session.agency_id]
        );
        
        const adminResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
        logActivity(req.session.agency_id, req.session.userId, adminResult.rows[0].username, 'CREATE_USER', `کاربر جدید با نام «${username}» ایجاد شد.`);

        res.status(201).json({ success: true, message: 'کاربر جدید با موفقیت ایجاد شد.' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'این نام کاربری قبلا استفاده شده است.' });
        }
        console.error(err);
        res.status(500).json({ error: 'خطا در ایجاد کاربر جدید.' });
    }
};

const deleteAgencyUser = async (req, res) => {
    const userIdToDelete = req.params.userId;
    if (userIdToDelete == req.session.userId) {
        return res.status(403).json({ error: 'شما نمی‌توانید حساب کاربری خود را حذف کنید.' });
    }
    try {
        const userToDeleteRes = await pool.query('SELECT username FROM users WHERE id = $1', [userIdToDelete]);
        const userToDeleteName = userToDeleteRes.rows.length > 0 ? userToDeleteRes.rows[0].username : 'ناشناس';

        const result = await pool.query(
            "DELETE FROM users WHERE id = $1 AND agency_id = $2 AND role = 'agent'",
            [userIdToDelete, req.session.agency_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'کاربر یافت نشد یا شما اجازه حذف آن را ندارید.' });
        }
        
        const adminResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
        logActivity(req.session.agency_id, req.session.userId, adminResult.rows[0].username, 'DELETE_USER', `کاربر «${userToDeleteName}» حذف شد.`);
        
        res.json({ success: true, message: 'کاربر با موفقیت حذف شد.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطا در حذف کاربر.' });
    }
};

const getAgencyStats = async (req, res) => {
    const agency_id = req.session.agency_id;
    try {
        const totalEstatesQuery = pool.query('SELECT COUNT(*) FROM estates WHERE agency_id = $1', [agency_id]);
        const featuredEstatesQuery = pool.query('SELECT COUNT(*) FROM estates WHERE agency_id = $1 AND featured = true', [agency_id]);
        const estatesByDealTypeQuery = pool.query(`SELECT "dealType", COUNT(*) as count FROM estates WHERE agency_id = $1 GROUP BY "dealType"`, [agency_id]);

        const [
            totalEstatesResult,
            featuredEstatesResult,
            estatesByDealTypeResult
        ] = await Promise.all([totalEstatesQuery, featuredEstatesQuery, estatesByDealTypeQuery]);

        const stats = {
            totalEstates: parseInt(totalEstatesResult.rows[0].count, 10),
            featuredEstates: parseInt(featuredEstatesResult.rows[0].count, 10),
            byDealType: estatesByDealTypeResult.rows,
        };

        res.json(stats);

    } catch (err) {
        console.error('Error fetching agency stats:', err);
        res.status(500).json({ error: 'خطا در دریافت آمار' });
    }
};

const getAgencyLogs = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM activity_logs WHERE agency_id = $1 ORDER BY timestamp DESC LIMIT 20', 
            [req.session.agency_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching logs', err);
        res.status(500).json({ error: 'خطا در دریافت لاگ فعالیت‌ها' });
    }
};

module.exports = {
    getAgencyUsers,
    createAgencyUser,
    deleteAgencyUser,
    getAgencyStats,
    getAgencyLogs
};