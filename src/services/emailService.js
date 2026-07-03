const emailRepository = require('../repositories/emailRepository');
const inboxRepository = require('../repositories/inboxRepository');
const { generateRandomEmail } = require('../utils/generateEmail');

const EMAIL_EXPIRY_HOURS = 1;
const MAX_RETRIES = 5;
const MAX_EMAILS_PER_MINUTE = 3;

// In-memory rate limiter: sessionId -> [timestamps]
const rateLimitMap = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < 60000);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if the session has exceeded the rate limit (3 emails per minute)
 * Returns true if allowed, throws error if exceeded
 */
function checkRateLimit(sessionId) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(sessionId) || [];

  // Keep only timestamps within the last 60 seconds
  const recent = timestamps.filter((t) => now - t < 60000);

  if (recent.length >= MAX_EMAILS_PER_MINUTE) {
    const oldestInWindow = Math.min(...recent);
    const waitSeconds = Math.ceil((60000 - (now - oldestInWindow)) / 1000);
    throw new Error(`Rate limit exceeded. You can generate max ${MAX_EMAILS_PER_MINUTE} emails per minute. Try again in ${waitSeconds} seconds.`);
  }

  // Record this request
  recent.push(now);
  rateLimitMap.set(sessionId, recent);
}

const emailService = {
  getOrAssignEmail: async (sessionId) => {
    // Check if session already has an assigned email (no rate limit for fetching existing)
    const existing = await emailRepository.findBySessionId(sessionId);
    if (existing) {
      return existing;
    }

    // Rate limit only when generating a NEW email
    checkRateLimit(sessionId);

    // Generate a unique email (retry if collision)
    const emailAddress = await generateUniqueEmail();
    const expiresAt = new Date(Date.now() + EMAIL_EXPIRY_HOURS * 60 * 60 * 1000);
    const assigned = await emailRepository.assignEmail(emailAddress, sessionId, expiresAt);
    return assigned;
  },

  changeEmail: async (sessionId) => {
    // Rate limit when generating a new email
    checkRateLimit(sessionId);

    // Get the old email before releasing
    const oldEmail = await emailRepository.findBySessionId(sessionId);

    // Release the current email (marks as EXPIRED)
    await emailRepository.releaseEmail(sessionId);

    // Clear inbox data for the old email
    if (oldEmail && oldEmail.email_address) {
      await inboxRepository.deleteByEmail(oldEmail.email_address);
    }

    // Assign a fresh unique one
    const emailAddress = await generateUniqueEmail();
    const expiresAt = new Date(Date.now() + EMAIL_EXPIRY_HOURS * 60 * 60 * 1000);
    const assigned = await emailRepository.assignEmail(emailAddress, sessionId, expiresAt);
    return assigned;
  },

  getStatus: async (sessionId) => {
    const email = await emailRepository.findBySessionId(sessionId);
    if (!email) return null;

    const now = new Date();
    const expiresAt = new Date(email.expires_at);
    const remainingMs = Math.max(0, expiresAt - now);
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    return {
      email_address: email.email_address,
      status: email.status,
      created_at: email.created_at,
      expires_at: email.expires_at,
      remaining_minutes: remainingMinutes,
      is_expired: remainingMs <= 0,
    };
  },
};

/**
 * Generate a unique email that doesn't already exist as ASSIGNED in the database
 */
async function generateUniqueEmail() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const emailAddress = generateRandomEmail();
    const exists = await emailRepository.findByEmailAddress(emailAddress);
    if (!exists) {
      return emailAddress;
    }
  }
  return generateRandomEmail();
}

module.exports = emailService;
