
const pool = require('../config/db');

async function logActivity(agencyId, userId, username, actionType, details) {
    try {
        await pool.query(
            'INSERT INTO activity_logs (agency_id, user_id, username, action_type, details) VALUES ($1, $2, $3, $4, $5)',
            [agencyId, userId, username, actionType, details]
        );
    } catch (err) {
        console.error('Failed to log activity:', err);
    }
}

module.exports = { logActivity };