require('dotenv').config();
const { Pool } = require('pg');

const TOTAL_RECORDS = 2000;
const AGENCY_ID = process.argv[2];

if (!AGENCY_ID) {
    console.error('خطا: لطفاً شناسه بنگاه (agency_id) را به عنوان آرگومان وارد کنید.');
    console.log('مثال: node seed.js 2');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const sampleData = {
    titles: ['آپارتمان شیک', 'ویلای لوکس', 'زمین مناسب سرمایه‌گذاری', 'مغازه در مرکز شهر', 'دفتر کار مدرن', 'خانه کلنگی'],
    streets: ['فردوسی', 'مصدق', 'بهشتی', 'شریعتی', 'طالقانی', 'مدرس', 'حافظ'],
    owners: ['رضا احمدی', 'سارا محمدی', 'علی کریمی', 'مریم حسینی', 'سعید قاسمی', 'فاطمه جعفری'],
    propertyTypes: ['apartment', 'villa', 'land', 'store', 'office', 'old'],
    dealTypes: ['sale', 'rent', 'mortgage', 'pre-sale'],
};

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomBool = () => Math.random() < 0.5;

const generateRandomEstate = (agencyId, index) => {
    const propertyType = getRandomItem(sampleData.propertyTypes);
    const title = `[TEST_DATA] ${getRandomItem(sampleData.titles)} در خیابان ${getRandomItem(sampleData.streets)}`;
    
    // مختصات رندوم در اطراف کرمانشاه
    const lat = 34.3142 + (Math.random() - 0.5) * 0.1;
    const lng = 47.0650 + (Math.random() - 0.5) * 0.1;

    return {
        id: `${Date.now()}${index}`,
        lat: lat,
        lng: lng,
        timestamp: new Date().toISOString(),
        title: title,
        owner: getRandomItem(sampleData.owners),
        phone: `0918${getRandomNumber(1000000, 9999999)}`,
        date: new Date().toISOString(),
        address: `خیابان ${getRandomItem(sampleData.streets)}، کوچه ${getRandomNumber(1, 20)}`,
        dealType: getRandomItem(sampleData.dealTypes),
        type: propertyType,
        totalPrice: getRandomNumber(500000000, 5000000000),
        pricePerMeter: getRandomNumber(10000000, 50000000),
        builtArea: (propertyType !== 'land') ? getRandomNumber(60, 300) : null,
        bedrooms_data: '[]',
        images: '[]',
        hasParking: getRandomBool(),
        hasStorage: getRandomBool(),
        hasElevator: (propertyType === 'apartment'),
        agency_id: agencyId,
        featured: getRandomBool(),
    };
};

const insertEstates = async () => {
    const client = await pool.connect();
    console.log(`اتصال به دیتابیس برقرار شد. شروع به افزودن ${TOTAL_RECORDS} ملک برای بنگاه با شناسه ${AGENCY_ID}...`);
    
    try {
        await client.query('BEGIN');
        for (let i = 0; i < TOTAL_RECORDS; i++) {
            const estate = generateRandomEstate(AGENCY_ID, i);
            const query = `
                INSERT INTO estates (id, lat, lng, timestamp, title, owner, phone, date, address, "dealType", type, "totalPrice", "pricePerMeter", "builtArea", bedrooms_data, images, "hasParking", "hasStorage", "hasElevator", agency_id, featured)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);
            `;
            const values = [
                estate.id, estate.lat, estate.lng, estate.timestamp, estate.title, estate.owner, estate.phone, estate.date, estate.address, estate.dealType, estate.type,
                estate.totalPrice, estate.pricePerMeter, estate.builtArea, estate.bedrooms_data, estate.images, estate.hasParking, estate.hasStorage, estate.hasElevator, estate.agency_id, estate.featured
            ];
            await client.query(query, values);
            
            if ((i + 1) % 100 === 0) {
                console.log(`${i + 1} / ${TOTAL_RECORDS} ملک اضافه شد...`);
            }
        }
        await client.query('COMMIT');
        console.log(`\nموفقیت! ${TOTAL_RECORDS} ملک تست با موفقیت به دیتابیس اضافه شد.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\nخطا! عملیات ناموفق بود و تمام تغییرات به حالت قبل بازگشت.');
        console.error(err.message);
    } finally {
        client.release();
        await pool.end();
        console.log('اتصال به دیتابیس بسته شد.');
    }
};

insertEstates();