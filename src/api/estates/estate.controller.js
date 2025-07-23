const pool = require('../../config/db');
const { logActivity } = require('../../utils/logger');
const moment = require('moment-jalaali');

const ALLOWED_ESTATE_FIELDS = [
    'owner', 'phone', 'date', 'address', 'dealType', 'type', 'totalPrice',
    'pricePerMeter', 'builtArea', 'totalFloors', 'totalUnits', 'floor',
    'orientation', 'kitchenCabinets', 'bathroomType', 'flooring', 'coolerType',
    'hasParking', 'hasStorage', 'hasBalcony', 'hasPackage', 'hasHeater',
    'hasElevator', 'landArea', 'frontage', 'propertyStatus', 'buildingAge',
    'description', 'featured', 'renovationStatus', 'alleyWidth'
];

const validateAndParseNumber = (value) => {
    if (value === null || value === undefined || String(value).trim() === '') {
        return null;
    }
    const numStr = String(value).trim();
    if (!/^-?\d*\.?\d+$/.test(numStr)) {
        throw new Error(`مقدار عددی نامعتبر: "${value}"`);
    }
    return Number(numStr);
};

const parseEstateData = (estate) => {
    if (!estate) return null;

    let images = [];
    if (typeof estate.images === 'string') {
        try {
            images = JSON.parse(estate.images);
        } catch (e) {
            images = [];
        }
    } else if (Array.isArray(estate.images)) {
        images = estate.images;
    }

    return {
        ...estate,
        bedrooms: estate.bedrooms_data || [],
        images: images,
        location: (estate.lat && estate.lng) ? [estate.lat, estate.lng] : null
    };
};

const convertPersianDateToGregorian = (persianDate) => {
    if (persianDate && moment(persianDate, 'jYYYY/jMM/jDD').isValid()) {
        return moment(persianDate, 'jYYYY/jMM/jDD').format('YYYY-MM-DD');
    }
    return null;
};

const getAllEstates = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM estates WHERE agency_id = $1 ORDER BY timestamp DESC', [req.session.agency_id]);
        res.json(result.rows.map(parseEstateData));
    } catch (err) {
        console.error('Error fetching estates:', err);
        res.status(500).json({ error: 'خطا در واکشی املاک' });
    }
};

const getEstateById = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM estates WHERE id = $1 AND agency_id = $2', [req.params.id, req.session.agency_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'ملک یافت نشد' });
        res.json(parseEstateData(result.rows[0]));
    } catch (err) {
        console.error('Error fetching estate by id:', err);
        res.status(500).json({ error: 'خطا در واکشی جزئیات ملک' });
    }
};

const createEstate = async (req, res) => {
    try {
        const { id, location, timestamp, bedrooms, title, ...otherFields } = req.body;

        if (otherFields.date) {
            otherFields.date = convertPersianDateToGregorian(otherFields.date);
        }

        let parsedLocation;
        try {
            parsedLocation = JSON.parse(location);
        } catch (e) {
            return res.status(400).json({ success: false, error: 'فرمت موقعیت مکانی نامعتبر است.' });
        }

        if (!title || title.trim() === '') {
            return res.status(400).json({ success: false, error: 'عنوان ملک الزامی است.' });
        }
        if (parsedLocation === undefined || parsedLocation === null) {
            return res.status(400).json({ success: false, error: 'موقعیت مکانی ملک مشخص نشده است.' });
        }

        const numericFields = ['totalPrice', 'pricePerMeter', 'builtArea', 'totalFloors', 'totalUnits', 'floor', 'landArea', 'frontage', 'buildingAge', 'alleyWidth'];
        for (const field of numericFields) {
            if (otherFields.hasOwnProperty(field)) {
                otherFields[field] = validateAndParseNumber(otherFields[field]);
            }
        }
        
        let parsedBedrooms = JSON.parse(bedrooms || '[]');
        parsedBedrooms = parsedBedrooms.map(bed => ({
            ...bed,
            area: validateAndParseNumber(bed.area)
        }));

        const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const { lat, lng } = parsedLocation ? { lat: parsedLocation[0], lng: parsedLocation[1] } : { lat: null, lng: null };
        const bedroomsDataString = JSON.stringify(parsedBedrooms);
        const imagesDataString = JSON.stringify(images);

        const columns = ['"id"', '"lat"', '"lng"', '"timestamp"', '"bedrooms_data"', '"images"', '"agency_id"', '"title"'];
        const values = [id, lat, lng, timestamp, bedroomsDataString, imagesDataString, req.session.agency_id, title];

        for (const [key, value] of Object.entries(otherFields)) {
            if (ALLOWED_ESTATE_FIELDS.includes(key)) {
                columns.push(`"${key}"`);
                values.push(value);
            }
        }

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO estates (${columns.join(', ')}) VALUES (${placeholders})`;

        await pool.query(sql, values);
        
        const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
        logActivity(req.session.agency_id, req.session.userId, userResult.rows[0].username, 'CREATE_ESTATE', `ملک جدید با عنوان «${title}» ثبت شد.`);

        res.status(201).json({ success: true });
    } catch (err) {
        if (err.message.startsWith('مقدار عددی نامعتبر')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Error creating estate:', err);
        res.status(500).json({ error: 'خطا در ثبت ملک' });
    }
};

const updateEstate = async (req, res) => {
    try {
        const { id, location, timestamp, bedrooms, existingImages, title, ...otherFields } = req.body;
        
        if (otherFields.date) {
            otherFields.date = convertPersianDateToGregorian(otherFields.date);
        }

        let parsedLocation;
        try {
            parsedLocation = JSON.parse(location);
        } catch (e) {
            return res.status(400).json({ success: false, error: 'فرمت موقعیت مکانی نامعتبر است.' });
        }

        if (!title || title.trim() === '') {
            return res.status(400).json({ success: false, error: 'عنوان ملک الزامی است.' });
        }
        
        const numericFields = ['totalPrice', 'pricePerMeter', 'builtArea', 'totalFloors', 'totalUnits', 'floor', 'landArea', 'frontage', 'buildingAge', 'alleyWidth'];
        for (const field of numericFields) {
            if (otherFields.hasOwnProperty(field)) {
                otherFields[field] = validateAndParseNumber(otherFields[field]);
            }
        }
        
        let parsedBedrooms = JSON.parse(bedrooms || '[]');
        parsedBedrooms = parsedBedrooms.map(bed => ({
            ...bed,
            area: validateAndParseNumber(bed.area)
        }));

        const newImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const finalImages = [...(JSON.parse(existingImages || '[]')), ...newImages];
        
        const { lat, lng } = parsedLocation ? { lat: parsedLocation[0], lng: parsedLocation[1] } : { lat: null, lng: null };
        const bedroomsDataString = JSON.stringify(parsedBedrooms);
        const imagesDataString = JSON.stringify(finalImages);

        let updateFields = [`"lat" = $1`, `"lng" = $2`, `"timestamp" = $3`, `"bedrooms_data" = $4`, `"images" = $5`, `"title" = $6`];
        let params = [lat, lng, timestamp, bedroomsDataString, imagesDataString, title];

        let paramIndex = 7;
        for (const [key, value] of Object.entries(otherFields)) {
            if (ALLOWED_ESTATE_FIELDS.includes(key)) {
                updateFields.push(`"${key}" = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        }

        params.push(req.params.id, req.session.agency_id);

        const sql = `UPDATE estates SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}`;
        const result = await pool.query(sql, params);
        if (result.rowCount === 0) return res.status(404).json({ error: 'ملکی برای ویرایش یافت نشد' });

        const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
        logActivity(req.session.agency_id, req.session.userId, userResult.rows[0].username, 'UPDATE_ESTATE', `ملک «${title}» به‌روزرسانی شد.`);

        res.json({ success: true });
    } catch (err) {
        if (err.message.startsWith('مقدار عددی نامعتبر')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Error updating estate:', err);
        res.status(500).json({ error: 'خطا در به‌روزرسانی ملک' });
    }
};

const deleteEstate = async (req, res) => {
    const estateId = req.params.id;
    try {
        const estateRes = await pool.query('SELECT title FROM estates WHERE id = $1', [estateId]);
        const estateTitle = estateRes.rows.length > 0 ? estateRes.rows[0].title : `ملک با شناسه ${estateId}`;
        
        const result = await pool.query('DELETE FROM estates WHERE id = $1 AND agency_id = $2', [estateId, req.session.agency_id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'ملکی برای حذف یافت نشد' });
        
        const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
        logActivity(req.session.agency_id, req.session.userId, userResult.rows[0].username, 'DELETE_ESTATE', `ملک «${estateTitle}» حذف شد.`);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting estate:', err);
        res.status(500).json({ error: 'خطا در حذف ملک' });
    }
};

module.exports = {
    getAllEstates,
    getEstateById,
    createEstate,
    updateEstate,
    deleteEstate
};