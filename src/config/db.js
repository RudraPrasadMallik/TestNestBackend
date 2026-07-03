const { MongoClient } = require('mongodb');
const { Pool } = require('pg');
const dns = require('dns');
const { resolve4, resolveSrv } = require('dns').promises;
require('dotenv').config();

// Force Node.js to use IPv4 and system DNS resolver
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const DB_TYPE = (process.env.DB_TYPE || 'mongodb').toLowerCase();

let db = null;
let client = null;

const connectDb = async () => {
  if (DB_TYPE === 'postgres' || DB_TYPE === 'pg') {
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'tempmail',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

    // Test connection
    const testClient = await pool.connect();
    testClient.release();
    console.log('[DB] Connected to PostgreSQL');

    client = pool;
    db = pool;
    return db;
  } else {
    // Default: MongoDB
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
    const DB_NAME = process.env.DB_NAME || 'tempmail';

    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('[DB] Connected to MongoDB');
    return db;
  }
};

const getDb = () => {
  if (!db) {
    throw new Error('[DB] Database not initialized. Call connectDb() first.');
  }
  return db;
};

const getClient = () => client;
const getDbType = () => DB_TYPE;

module.exports = { connectDb, getDb, getClient, getDbType };
