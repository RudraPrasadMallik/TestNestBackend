const { getDb, getDbType } = require('../config/db');

const emailRepository = {
  findByEmailAddress: async (emailAddress) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        'SELECT * FROM emails WHERE email_address = $1 AND status = $2 LIMIT 1',
        [emailAddress, 'ASSIGNED']
      );
      return result.rows[0] || null;
    } else {
      const db = getDb();
      return await db.collection('emails').findOne({ email_address: emailAddress, status: 'ASSIGNED' });
    }
  },

  findBySessionId: async (sessionId) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        'SELECT * FROM emails WHERE session_id = $1 AND status = $2 LIMIT 1',
        [sessionId, 'ASSIGNED']
      );
      return result.rows[0] || null;
    } else {
      const db = getDb();
      return await db.collection('emails').findOne({ session_id: sessionId, status: 'ASSIGNED' });
    }
  },

  findAvailable: async () => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        'SELECT * FROM emails WHERE status = $1 LIMIT 1',
        ['AVAILABLE']
      );
      return result.rows[0] || null;
    } else {
      const db = getDb();
      return await db.collection('emails').findOne({ status: 'AVAILABLE' });
    }
  },

  assignEmail: async (emailAddress, sessionId, expiresAt) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        `INSERT INTO emails (email_address, status, session_id, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email_address) DO UPDATE
         SET status = $2, session_id = $3, expires_at = $4
         RETURNING *`,
        [emailAddress, 'ASSIGNED', sessionId, expiresAt]
      );
      return result.rows[0];
    } else {
      const db = getDb();
      const result = await db.collection('emails').findOneAndUpdate(
        { email_address: emailAddress },
        {
          $set: {
            email_address: emailAddress,
            status: 'ASSIGNED',
            session_id: sessionId,
            expires_at: expiresAt,
          },
          $setOnInsert: { created_at: new Date() },
        },
        { upsert: true, returnDocument: 'after' }
      );
      return result;
    }
  },

  releaseEmail: async (sessionId) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      await pool.query(
        'UPDATE emails SET status = $1, session_id = NULL WHERE session_id = $2 AND status = $3',
        ['EXPIRED', sessionId, 'ASSIGNED']
      );
    } else {
      const db = getDb();
      await db.collection('emails').updateMany(
        { session_id: sessionId, status: 'ASSIGNED' },
        { $set: { status: 'EXPIRED', session_id: null } }
      );
    }
  },

  expireOldEmails: async () => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      await pool.query(
        'UPDATE emails SET status = $1, session_id = NULL WHERE status = $2 AND expires_at < NOW()',
        ['EXPIRED', 'ASSIGNED']
      );
    } else {
      const db = getDb();
      await db.collection('emails').updateMany(
        { status: 'ASSIGNED', expires_at: { $lt: new Date() } },
        { $set: { status: 'EXPIRED', session_id: null } }
      );
    }
  },

  findExpiredEmails: async () => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        'SELECT * FROM emails WHERE status = $1 AND expires_at < NOW()',
        ['ASSIGNED']
      );
      return result.rows;
    } else {
      const db = getDb();
      return await db.collection('emails')
        .find({ status: 'ASSIGNED', expires_at: { $lt: new Date() } })
        .toArray();
    }
  },
};

module.exports = emailRepository;
