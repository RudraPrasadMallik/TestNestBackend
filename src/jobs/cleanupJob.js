const emailRepository = require('../repositories/emailRepository');
const inboxRepository = require('../repositories/inboxRepository');
const webhookService = require('../services/webhookService');

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes

function startCleanupJob() {
  console.log('[CleanupJob] Started — running every 5 minutes');

  setInterval(async () => {
    try {
      // --- Temp Mail cleanup ---
      const expiredEmails = await emailRepository.findExpiredEmails();
      await emailRepository.expireOldEmails();

      for (const email of expiredEmails) {
        await inboxRepository.deleteByEmail(email.email_address);
      }

      if (expiredEmails.length > 0) {
        console.log(`[CleanupJob] Expired ${expiredEmails.length} emails and cleared their inbox data`);
      }

      // --- Webhook cleanup ---
      await webhookService.cleanupExpired();

    } catch (err) {
      console.error('[CleanupJob] Error:', err.message);
    }
  }, CLEANUP_INTERVAL_MS);
}

module.exports = { startCleanupJob };
