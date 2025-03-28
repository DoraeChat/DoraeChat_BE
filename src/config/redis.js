const { createClient } = require("@redis/client");
const Redis = require("ioredis");

const client = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`, // URL kết nối Redis
});

client.on("connect", () => {
  console.log("Redis Connected!");
});

client.on("error", (error) => {
  console.error("Redis Error: ", error);
});

const set = async (key, value, expirationSeconds = 600) => {
  try {
    await client.set(key, JSON.stringify(value), { EX: expirationSeconds });
  } catch (err) {
    console.error("Redis set error:", err);
  }
};

const get = async (key) => {
  try {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Redis get error:", err);
    return null;
  }
};

const exists = async (key) => {
  return (await client.exists(key)) === 1;
};

const del = async (key) => {
  try {
    await this.client.del(key);
  } catch (err) {
    console.error("Redis del error:", err);
  }
};

const flush = async () => {
  try {
    await this.client.flushdb();
  } catch (err) {
    console.error("Redis flush error:", err);
  }
};

async function initializeRedis() {
  try {
    await client.connect();
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
}

initializeRedis();

module.exports = {
  set,
  get,
  exists,
  del,
  flush,
};
