const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// API routes (used by frontend)
router.post('/webhook-api/create', webhookController.createEndpoint);
router.get('/webhook-api/requests/:endpointId', webhookController.getRequests);
router.delete('/webhook-api/requests/:endpointId', webhookController.clearRequests);
router.get('/webhook-api/status/:endpointId', webhookController.getStatus);

// Catch-all webhook receiver (any method)
router.all('/webhook/:endpointId', webhookController.receiveWebhook);

module.exports = router;
