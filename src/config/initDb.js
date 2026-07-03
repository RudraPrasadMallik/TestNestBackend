const { getDb, getDbType } = require('./db');

const initDb = async () => {
  const dbType = getDbType();

  if (dbType === 'postgres' || dbType === 'pg') {
    const pool = getDb();
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS emails (
          id SERIAL PRIMARY KEY,
          email_address VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
          session_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS inbox (
          id SERIAL PRIMARY KEY,
          email_address VARCHAR(255) NOT NULL,
          sender VARCHAR(255),
          subject VARCHAR(500),
          body TEXT,
          received_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_emails_session_id ON emails(session_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_inbox_email_address ON inbox(email_address);`);

      console.log('[DB] PostgreSQL tables initialized');
    } finally {
      client.release();
    }
  } else {
    // MongoDB
    const db = getDb();

    const emailsCollection = db.collection('emails');
    await emailsCollection.createIndex({ email_address: 1 }, { unique: true });
    await emailsCollection.createIndex({ session_id: 1 });
    await emailsCollection.createIndex({ status: 1 });
    await emailsCollection.createIndex({ expires_at: 1 });

    const inboxCollection = db.collection('inbox');
    await inboxCollection.createIndex({ email_address: 1 });
    await inboxCollection.createIndex({ received_at: -1 });

    const webhookEndpoints = db.collection('webhook_endpoints');
    await webhookEndpoints.createIndex({ endpoint_id: 1 }, { unique: true });
    await webhookEndpoints.createIndex({ session_id: 1 });
    await webhookEndpoints.createIndex({ expires_at: 1 });

    const webhookRequests = db.collection('webhook_requests');
    await webhookRequests.createIndex({ endpoint_id: 1 });
    await webhookRequests.createIndex({ received_at: -1 });

    console.log('[DB] MongoDB indexes initialized');
  }
};

module.exports = initDb;
