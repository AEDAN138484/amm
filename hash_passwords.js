require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function hashExistingPasswords() {
    const client = await pool.connect();
    try {
        console.log('در حال خواندن کاربران از دیتابیس...');
        const res = await client.query('SELECT id, password FROM users');
        const users = res.rows;

        for (const user of users) {
            if (user.password && !user.password.startsWith('$2b$')) {
                console.log(`در حال هش کردن رمز عبور برای کاربر با شناسه: ${user.id}...`);
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
                console.log(`رمز عبور برای کاربر ${user.id} با موفقیت هش و آپدیت شد.`);
            } else {
                console.log(`رمز عبور کاربر ${user.id} از قبل هش شده است. از این مرحله رد می‌شویم.`);
            }
        }
        console.log('\nعملیات هش کردن تمام رمزهای عبور با موفقیت به پایان رسید.');
    } catch (err) {
        console.error('خطا در هنگام هش کردن رمزهای عبور:', err);
    } finally {
        await client.release();
        await pool.end();
    }
}

hashExistingPasswords();