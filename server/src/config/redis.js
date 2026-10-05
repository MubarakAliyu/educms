const { createClient } = require("redis");

let client = null;
const memoryCache = new Map();

async function connectRedis() {
  if (process.env.REDIS_ENABLED !== "true") return null;
  if (client) return client;

  client = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  client.on("error", (error) => console.error("Redis error:", error.message));

  try {
    await client.connect();
    return client;
  } catch (error) {
    console.warn("Redis unavailable; using in-memory fallback:", error.message);
    client = null;
    return null;
  }
}

async function get(key) {
  const redis = await connectRedis();
  if (redis) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function set(key, value, ttlSeconds = 120) {
  const redis = await connectRedis();
  if (redis) {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function del(key) {
  const redis = await connectRedis();
  if (redis) return redis.del(key);
  memoryCache.delete(key);
}

async function delByPrefix(prefix) {
  const redis = await connectRedis();
  if (redis) {
    const keys = [];
    for await (const key of redis.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 })) keys.push(key);
    if (keys.length) await redis.del(keys);
    return;
  }
  [...memoryCache.keys()].forEach((key) => key.startsWith(prefix) && memoryCache.delete(key));
}

async function closeRedis() {
  if (client?.isOpen) await client.quit();
  client = null;
}

module.exports = { connectRedis, get, set, del, delByPrefix, closeRedis };
