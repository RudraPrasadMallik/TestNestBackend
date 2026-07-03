const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const inboxRepository = require('../repositories/inboxRepository');
const { notifyNewEmail } = require('../websocket/socketManager');

const SMTP_PORT = process.env.SMTP_PORT || 2525;
const DOMAIN = process.env.MAIL_DOMAIN || 'tempmail.dev';

function createSmtpServer() {
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],

    // Only accept emails for our domain
    onRcptTo(address, session, callback) {
      const recipient = address.address.toLowerCase();
      if (!recipient.endsWith(`@${DOMAIN}`)) {
        return callback(new Error(`We do not accept mail for ${recipient}`));
      }
      callback();
    },

    // Handle incoming email data
    onData(stream, session, callback) {
      let emailData = '';

      stream.on('data', (chunk) => {
        emailData += chunk.toString();
      });

      stream.on('end', async () => {
        try {
          const parsed = await simpleParser(emailData);
          const recipients = session.envelope.rcptTo.map(r => r.address.toLowerCase());

          for (const recipient of recipients) {
            const savedMessage = await inboxRepository.addMessage({
              email_address: recipient,
              sender: parsed.from ? parsed.from.text : 'unknown',
              subject: parsed.subject || '(No Subject)',
              body: parsed.text || parsed.html || '',
            });

            // Notify connected WebSocket clients
            notifyNewEmail(recipient, savedMessage);

            console.log(`[SMTP] Email received for: ${recipient} | From: ${parsed.from?.text} | Subject: ${parsed.subject}`);
          }

          callback();
        } catch (err) {
          console.error('[SMTP] Error processing email:', err.message);
          callback(err);
        }
      });
    },
  });

  return server;
}

function startSmtpServer() {
  const server = createSmtpServer();

  server.listen(SMTP_PORT, () => {
    console.log(`[SMTP] Listening on port ${SMTP_PORT} for @${DOMAIN}`);
  });

  server.on('error', (err) => {
    console.error('[SMTP] Server error:', err.message);
  });

  return server;
}

module.exports = { startSmtpServer };
