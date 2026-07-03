const inboxService = require('../services/inboxService');

const inboxController = {
  getInbox: async (req, res) => {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ error: 'email query parameter is required' });
      }

      const messages = await inboxService.getMessages(email);
      return res.json({ success: true, messages });
    } catch (err) {
      console.error('Error in getInbox:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  deleteInbox: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'email is required' });
      }

      await inboxService.deleteMessages(email);
      return res.json({ success: true, message: 'Inbox cleared' });
    } catch (err) {
      console.error('Error in deleteInbox:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = inboxController;
