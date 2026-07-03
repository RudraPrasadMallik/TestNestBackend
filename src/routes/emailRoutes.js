const express = require('express');
const { rateLimit } = require('express-rate-limit');
const router = express.Router();
const emailController = require('../controllers/emailController');
const inboxController = require('../controllers/inboxController');

// Rate limiting: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

router.use(apiLimiter);

// Email endpoints
router.post('/email/get', emailController.getEmail);
router.post('/email/change', emailController.changeEmail);
router.get('/email/status', emailController.getStatus);

// Inbox endpoints
router.get('/inbox', inboxController.getInbox);
router.delete('/inbox', inboxController.deleteInbox);

module.exports = router;
