// src/api/agency/agency.routes.js
const express = require('express');
const router = express.Router();
const agencyController = require('./agency.controller');

router.get('/stats', agencyController.getAgencyStats);
router.get('/logs', agencyController.getAgencyLogs);
router.post('/users', agencyController.createAgencyUser);
router.delete('/users/:userId', agencyController.deleteAgencyUser);
router.get('/users', agencyController.getAgencyUsers);

module.exports = router;