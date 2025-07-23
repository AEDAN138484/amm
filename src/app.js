const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

const authMiddleware = require('./middleware/auth');
const superAdminRoutes = require('./api/super/super.routes');
const agencyRoutes = require('./api/agency/agency.routes');
const estatesRoutes = require('./api/estates/estate.routes');
const subscriptionRoutes = require('./api/subscription/subscription.routes');

app.use('/api/super', authMiddleware.isAuthenticated, authMiddleware.isAnySuperAdmin, superAdminRoutes);
app.use('/api/agency', authMiddleware.isAuthenticated, authMiddleware.isAgencyAdmin, authMiddleware.checkSubscription, agencyRoutes);
app.use('/api/estates', authMiddleware.isAuthenticated, authMiddleware.checkSubscription, estatesRoutes);
app.use('/api/subscriptions', authMiddleware.isAuthenticated, subscriptionRoutes);


app.get('/api/session-info', (req, res) => {
    if (req.session.userId) {
        res.json({ userId: req.session.userId, role: req.session.role, agency_id: req.session.agency_id });
    } else {
        res.status(401).json({ error: 'کاربر احراز هویت نشده است.' });
    }
});

app.get('/api/agency-info', authMiddleware.isAuthenticated, async (req, res) => {
    try {
        const pool = require('./config/db');
        const result = await pool.query('SELECT name FROM agencies WHERE id = $1', [req.session.agency_id]);
        if (result.rows.length > 0) {
            res.json({ name: result.rows[0].name });
        } else {
            res.status(404).json({ error: 'اطلاعات بنگاه یافت نشد.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'خطا در دریافت اطلاعات بنگاه.' });
    }
});


app.post('/api/login', async (req, res) => {
    const { username } = req.body;
    const password = req.body.password ? req.body.password.trim() : '';

    try {
        const pool = require('./config/db');
        const result = await pool.query('SELECT id, password, role, agency_id FROM users WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = (password === user.password);
            if (match) {
                req.session.userId = user.id;
                req.session.role = user.role;
                req.session.agency_id = user.agency_id;              
                if (user.role === 'agency_admin' || user.role === 'agent') {
                    const agencyResult = await pool.query('SELECT status, subscription_end_date FROM agencies WHERE id = $1', [user.agency_id]);
                    const agency = agencyResult.rows[0];
                    if (agency && (agency.status !== 'active' || new Date(agency.subscription_end_date) < new Date())) {
                        req.session.tempRole = user.role; 
                        res.status(403).json({ success: false, code: 'SUBSCRIPTION_INACTIVE', message: 'اشتراک بنگاه منقضی شده است.', role: user.role });
                        return;
                    }
                }
                res.json({ success: true, message: 'ورود موفقیت‌آمیز', role: user.role });
            } else {
                res.status(401).json({ success: false, error: 'نام کاربری یا رمز عبور اشتباه است.' });
            }
        } else {
            res.status(401).json({ success: false, error: 'نام کاربری یا رمز عبور اشتباه است.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'خطای سرور' });
    }
});



app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'خطا در خروج.' });
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'با موفقیت خارج شدید.' });
    });
});

app.get('/', authMiddleware.redirectIfUnauthenticated, authMiddleware.checkSubscription, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/index.html'));
});

app.get('/estates-list.html', authMiddleware.redirectIfUnauthenticated, authMiddleware.checkSubscription, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/estates-list.html'));
});

app.get('/estate-detail/:id', authMiddleware.redirectIfUnauthenticated, authMiddleware.checkSubscription, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/estate-detail.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/login.html'));
});

app.get('/subscribe', authMiddleware.redirectIfUnauthenticated, (req, res) => {
    if (req.session.role !== 'agency_admin' && req.session.tempRole !== 'agency_admin') {
        return res.status(403).send('<h1>شما اجازه دسترسی به این صفحه را ندارید.</h1>');
    }
    res.sendFile(path.join(__dirname, '../public/html/subscribe.html'));
});

app.get('/super-admin', authMiddleware.redirectIfUnauthenticated, authMiddleware.isAnySuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/super-admin.html'));
});

app.get('/agency-panel', authMiddleware.redirectIfUnauthenticated, authMiddleware.isAgencyAdmin, authMiddleware.checkSubscription, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html/agency-panel.html'));
});

module.exports = app;