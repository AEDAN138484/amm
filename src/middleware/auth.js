const pool = require('../config/db');

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'لطفاً ابتدا وارد شوید' });
};

const redirectIfUnauthenticated = (req, res, next) => {

    if (req.path === '/subscribe' && req.session.tempRole === 'agency_admin') {
        return next();
    }

    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

const checkSubscription = async (req, res, next) => {
    if (req.session.role === 'super_admin' || req.session.role === 'support_admin') {
        return next();
    }
    if (req.session.agency_id) {
        try {
            const result = await pool.query('SELECT status, subscription_end_date FROM agencies WHERE id = $1', [req.session.agency_id]);
            if (result.rows.length > 0) {
                const agency = result.rows[0];
                if (agency.status === 'active' && new Date(agency.subscription_end_date) >= new Date()) {
                    // اگر اشتراک فعال شد، tempRole را پاک کن
                    if (req.session.tempRole) {
                        delete req.session.tempRole;
                    }
                    return next();
                } else {
                    const isApiRequest = req.xhr || req.headers.accept.includes('application/json');

                    if (req.session.role === 'agency_admin') {

                        req.session.tempRole = 'agency_admin';
                        if (isApiRequest) {
                             return res.status(403).json({ success: false, code: 'SUBSCRIPTION_INACTIVE', message: 'اشتراک بنگاه شما منقضی شده است. لطفاً برای تمدید اقدام کنید.' });
                        } else {
                            return res.redirect('/subscribe');
                        }
                    } else {
                        if (isApiRequest) {
                            return res.status(403).json({ success: false, code: 'SUBSCRIPTION_INACTIVE', message: 'اشتراک بنگاه شما منقضی شده است. لطفاً با مدیر خود تماس بگیرید.' });
                        } else {
                            return res.status(403).send('<h1>اشتراک بنگاه شما منقضی شده است. لطفاً با مدیر خود تماس بگیگرید.</h1>');
                        }
                    }
                }
            }
        } catch (err) {
             console.error('Error in checkSubscription:', err);
             return res.status(500).send('خطای سرور در بررسی اشتراک.');
        }
    }
    const isApiRequest = req.xhr || req.headers.accept.includes('application/json');
    if (isApiRequest) {
        return res.status(403).json({ success: false, error: 'دسترسی غیر مجاز.' });
    } else {
        return res.status(403).send('<h1>دسترسی غیر مجاز.</h1>');
    }
};

const isSuperAdmin = (req, res, next) => {
    if (req.session.role === 'super_admin') {
        return next();
    }
    res.status(403).send('شما دسترسی لازم را ندارید.');
};

const isAnySuperAdmin = (req, res, next) => {
    if (req.session.role === 'super_admin' || req.session.role === 'support_admin') {
        return next();
    }
    res.status(403).send('شما دسترسی لازم را ندارید.');
};


const isAgencyAdmin = (req, res, next) => {
    if (['super_admin', 'agency_admin'].includes(req.session.role)) {
        return next();
    }
    res.status(403).send('شما دسترسی لازم را ندارید.');
};

module.exports = {
    isAuthenticated,
    redirectIfUnauthenticated,
    checkSubscription,
    isSuperAdmin,
    isAnySuperAdmin,
    isAgencyAdmin
};