const crypto = require('crypto');
const { getDb, getDbType } = require('../config/db');

const WEBHOOK_EXPIRY_HOURS = 2;
const MAX_REQUESTS_PER_ENDPOINT = 50;

const webhookService = {
  /**
   * Create a new webhook endpoint for a session
   */
  createEndpoint: async (sessionId) => {
    const dbType = getDbType();
    const endpointId = crypto.randomBytes(8).toString('hex'); // 16-char unique ID
    const expiresAt = new Date(Date.now() + WEBHOOK_EXPIRY_HOURS * 60 * 60 * 1000);

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      // Check if session already has an active endpoint
      const existing = await pool.query(
        'SELECT * FROM webhook_endpoints WHERE session_id = $1 AND expires_at > NOW() LIMIT 1',
        [sessionId]
      );
      if (existing.rows[0]) {
        return existing.rows[0];
      }
      const result = await pool.query(
        `INSERT INTO webhook_endpoints (endpoint_id, session_id, expires_at, created_at)
         VALUES ($1, $2, $3, NOW()) RETURNING *`,
        [endpointId, sessionId, expiresAt]
      );
      return result.rows[0];
    } else {
      const db = getDb();
      const collection = db.collection('webhook_endpoints');
      // Check if session already has an active endpoint
      const existing = await collection.findOne({
        session_id: sessionId,
        expires_at: { $gt: new Date() },
      });
      if (existing) {
        return existing;
      }
      const doc = {
        endpoint_id: endpointId,
        session_id: sessionId,
        expires_at: expiresAt,
        created_at: new Date(),
      };
      await collection.insertOne(doc);
      return doc;
    }
  },

  /**
   * Validate an endpoint exists and is not expired
   */
  validateEndpoint: async (endpointId) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        'SELECT * FROM webhook_endpoints WHERE endpoint_id = $1 AND expires_at > NOW() LIMIT 1',
        [endpointId]
      );
      return result.rows[0] || null;
    } else {
      const db = getDb();
      return await db.collection('webhook_endpoints').findOne({
        endpoint_id: endpointId,
        expires_at: { $gt: new Date() },
      });
    }
  },

  /**
   * Store an incoming webhook request
   */
  storeRequest: async (endpointId, requestData) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        `INSERT INTO webhook_requests (endpoint_id, method, headers, body, query, ip, received_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [endpointId, requestData.method, JSON.stringify(requestData.headers), JSON.stringify(requestData.body), JSON.stringify(requestData.query), requestData.ip]
      );
      // Keep only last N requests
      await pool.query(
        `DELETE FROM webhook_requests WHERE endpoint_id = $1 AND id NOT IN (
          SELECT id FROM webhook_requests WHERE endpoint_id = $1 ORDER BY received_at DESC LIMIT $2
        )`,
        [endpointId, MAX_REQUESTS_PER_ENDPOINT]
      );
      return result.rows[0];
    } else {
      const db = getDb();
      const collection = db.collection('webhook_requests');
      const doc = {
        endpoint_id: endpointId,
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body,
        query: requestData.query,
        ip: requestData.ip,
        received_at: new Date(),
      };
      const insertResult = await collection.insertOne(doc);

      // Keep only last N requests per endpoint
      const count = await collection.countDocuments({ endpoint_id: endpointId });
      if (count > MAX_REQUESTS_PER_ENDPOINT) {
        const oldest = await collection.find({ endpoint_id: endpointId })
          .sort({ received_at: 1 })
          .limit(count - MAX_REQUESTS_PER_ENDPOINT)
          .toArray();
        const idsToDelete = oldest.map(d => d._id);
        await collection.deleteMany({ _id: { $in: idsToDelete } });
      }

      return { ...doc, _id: insertResult.insertedId };
    }
  },

  /**
   * Get all requests for an endpoint
   */
  getRequests: async (endpointId) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const result = await pool.query(
        'SELECT * FROM webhook_requests WHERE endpoint_id = $1 ORDER BY received_at DESC',
        [endpointId]
      );
      return result.rows;
    } else {
      const db = getDb();
      return await db.collection('webhook_requests')
        .find({ endpoint_id: endpointId })
        .sort({ received_at: -1 })
        .toArray();
    }
  },

  /**
   * Clear all requests for an endpoint
   */
  clearRequests: async (endpointId) => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      await pool.query('DELETE FROM webhook_requests WHERE endpoint_id = $1', [endpointId]);
    } else {
      const db = getDb();
      await db.collection('webhook_requests').deleteMany({ endpoint_id: endpointId });
    }
  },

  /**
   * Cleanup expired endpoints and their requests
   */
  cleanupExpired: async () => {
    const dbType = getDbType();

    if (dbType === 'postgres' || dbType === 'pg') {
      const pool = getDb();
      const expired = await pool.query(
        'SELECT endpoint_id FROM webhook_endpoints WHERE expires_at < NOW()'
      );
      for (const row of expired.rows) {
        await pool.query('DELETE FROM webhook_requests WHERE endpoint_id = $1', [row.endpoint_id]);
      }
      await pool.query('DELETE FROM webhook_endpoints WHERE expires_at < NOW()');
    } else {
      const db = getDb();
      const expired = await db.collection('webhook_endpoints')
        .find({ expires_at: { $lt: new Date() } })
        .toArray();
      const expiredIds = expired.map(e => e.endpoint_id);
      if (expiredIds.length > 0) {
        await db.collection('webhook_requests').deleteMany({ endpoint_id: { $in: expiredIds } });
        await db.collection('webhook_endpoints').deleteMany({ endpoint_id: { $in: expiredIds } });
      }
    }
  },
};

module.exports = webhookService;
