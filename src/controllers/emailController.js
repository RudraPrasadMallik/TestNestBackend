const emailService = require('../services/emailService');

const emailController = {
  getEmail: async (req, res) => {
    try {
      const { session_id } = req.body;

      if (!session_id) {
        return res.status(400).json({ error: 'session_id is required' });
      }

      const email = await emailService.getOrAssignEmail(session_id);
      return res.json({ success: true, email });
    } catch (err) {
      if (err.message.startsWith('Rate limit exceeded')) {
        return res.status(429).json({ error: err.message });
      }
      console.error('Error in getEmail:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  changeEmail: async (req, res) => {
    try {
      const { session_id } = req.body;

      if (!session_id) {
        return res.status(400).json({ error: 'session_id is required' });
      }

      const email = await emailService.changeEmail(session_id);
      return res.json({ success: true, email });
    } catch (err) {
      if (err.message.startsWith('Rate limit exceeded')) {
        return res.status(429).json({ error: err.message });
      }
      console.error('Error in changeEmail:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getStatus: async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.status(400).json({ error: 'session_id query parameter is required' });
      }

      const status = await emailService.getStatus(session_id);
      if (!status) {
        return res.status(404).json({ error: 'No active email for this session' });
      }

      return res.json({ success: true, ...status });
    } catch (err) {
      console.error('Error in getStatus:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = emailController;
