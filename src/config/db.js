const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.connect((err) => {
    if (err) {
        console.error('خطا در اتصال به دیتابیس PostgreSQL:', err.stack);
        process.exit(1);
    } else {
        console.log('اتصال به دیتابیس PostgreSQL برقرار شد.');
    }
});

module.exports = pool;