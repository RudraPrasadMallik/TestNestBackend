const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/emailRoutes');
const jwtRoutes = require('./routes/jwtRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json({ limit: '50kb' }));

// Input sanitization - trim string fields (skip for JWT routes where whitespace matters)
app.use((req, res, next) => {
  if (req.path.startsWith('/jwt')) return next();
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
});

// Routes
app.use('/', emailRoutes);
app.use('/', jwtRoutes);
app.use('/', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
