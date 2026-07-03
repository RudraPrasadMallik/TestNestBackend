const { getDb, getDbType } = require('../config/db');

const inboxRepository = {
  findByEmail: async (emailAddress) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        'SELECT * FROM inbox WHERE email_address = $1 ORDER BY received_at DESC',
        [emailAddress]
      );
      return result.rows;
    } else {
      const db = getDb();
      return await db.collection('inbox')
        .find({ email_address: emailAddress })
        .sort({ received_at: -1 })
        .toArray();
    }
  },

  addMessage: async (message) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        `INSERT INTO inbox (email_address, sender, subject, body)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [message.email_address, message.sender, message.subject, message.body]
      );
      return result.rows[0];
    } else {
      const db = getDb();
      const doc = {
        email_address: message.email_address,
        sender: message.sender,
        subject: message.subject,
        body: message.body,
        received_at: new Date(),
      };
      const result = await db.collection('inbox').insertOne(doc);
      return { ...doc, _id: result.insertedId };
    }
  },

  deleteByEmail: async (emailAddress) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      await pool.query('DELETE FROM inbox WHERE email_address = $1', [emailAddress]);
    } else {
      const db = getDb();
      await db.collection('inbox').deleteMany({ email_address: emailAddress });
    }
  },
};

module.exports = inboxRepository;
