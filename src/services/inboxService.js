const inboxRepository = require('../repositories/inboxRepository');

const inboxService = {
  getMessages: async (emailAddress) => {
    if (!emailAddress) {
      throw new Error('Email address is required');
    }
    return await inboxRepository.findByEmail(emailAddress);
  },

  deleteMessages: async (emailAddress) => {
    if (!emailAddress) {
      throw new Error('Email address is required');
    }
    await inboxRepository.deleteByEmail(emailAddress);
  },
};

module.exports = inboxService;
