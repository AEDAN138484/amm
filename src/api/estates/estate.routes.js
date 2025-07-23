// src/api/estates/estate.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const estateController = require('./estate.controller');

const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb){
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits:{fileSize: 5 * 1024 * 1024},
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
}).array('images', 3);

function checkFileType(file, cb){
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    } else {
        cb('Error: فقط تصاویر مجاز هستند!');
    }
}

router.get('/', estateController.getAllEstates);
router.get('/:id', estateController.getEstateById);
router.post('/', (req, res) => {
    upload(req, res, (err) => {
        if(err){
            return res.status(400).json({ error: err });
        }
        estateController.createEstate(req, res);
    });
});
router.put('/:id', (req, res) => {
    upload(req, res, (err) => {
        if(err){
            return res.status(400).json({ error: err });
        }
        estateController.updateEstate(req, res);
    });
});
router.delete('/:id', estateController.deleteEstate);

module.exports = router;