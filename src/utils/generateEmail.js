const crypto = require('crypto');

const DOMAIN = process.env.MAIL_DOMAIN || 'tempmail.dev';

/**
 * Generates a readable email: first 4 chars are letters, next 6 are alphanumeric mix
 * Example: abcd7k2m9x@tempmail.dev
 */
function generateRandomEmail() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const alphanumeric = 'abcdefghijklmnopqrstuvwxyz0123456789';

  // First 4 characters: letters only
  let username = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = crypto.randomInt(0, letters.length);
    username += letters[randomIndex];
  }

  // Next 6 characters: mix of letters and numbers
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, alphanumeric.length);
    username += alphanumeric[randomIndex];
  }

  return `${username}@${DOMAIN}`;
}

module.exports = { generateRandomEmail };
