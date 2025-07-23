// src/api/subscription/subscription.routes.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('./subscription.controller');

router.get('/plans', subscriptionController.getSubscriptionPlans);
router.post('/renew', subscriptionController.renewSubscription);

module.exports = router;