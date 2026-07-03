/**
 * Quick script to send a test email to your temp mail address.
 * 
 * Usage: node sendTest.js YOUR_TEMP_EMAIL@tempmail.dev
 * Example: node sendTest.js a1b2c3d4e5f6@tempmail.dev
 */

const net = require('net');

const recipient = process.argv[2];

if (!recipient) {
  console.log('Usage: node sendTest.js <temp-email-address>');
  console.log('Example: node sendTest.js abc123@tempmail.dev');
  process.exit(1);
}

const sender = 'testuser@example.com';
const subject = 'Test Email - ' + new Date().toLocaleTimeString();
const body = 'Hello! This is a test email sent at ' + new Date().toISOString();

const commands = [
  `HELO localhost\r\n`,
  `MAIL FROM:<${sender}>\r\n`,
  `RCPT TO:<${recipient}>\r\n`,
  `DATA\r\n`,
  `From: ${sender}\r\nTo: ${recipient}\r\nSubject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\nContent-Type: text/plain\r\n\r\n${body}\r\n.\r\n`,
  `QUIT\r\n`,
];

let i = 0;

const client = net.createConnection(2525, 'localhost', () => {
  console.log('Connected to SMTP server...');
});

client.on('data', (data) => {
  const response = data.toString().trim();
  console.log('< ' + response);

  if (i < commands.length) {
    const cmd = commands[i++];
    console.log('> ' + cmd.trim());
    client.write(cmd);
  }
});

client.on('end', () => {
  console.log('\nDone! Check your inbox in the frontend.');
});

client.on('error', (err) => {
  console.error('Error:', err.message);
  console.log('Make sure the backend is running (npm run dev)');
});
