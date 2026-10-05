const { Pool } = require("pg");
const isTest = process.env.NODE_ENV === "test";
let pool;
let pgMem;

if (isTest) {
  const { newDb } = require("pg-mem");
  pgMem = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = pgMem.adapters.createPg();
  pool = new adapter.Pool();
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
}

async function query(text, params = []) {
  return pool.query(text, params);
}

async function transaction(callback) {
  if (isTest) return callback({ query });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function testConnection() {
  const result = await query("SELECT NOW() AS now");
  return result.rows[0];
}

async function close() {
  if (pool && pool.end) await pool.end();
}

module.exports = { query, transaction, testConnection, close, isTest, pgMem };
