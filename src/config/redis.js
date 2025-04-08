const { createClient } = require("@redis/client");

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
    const data = await client.get(key);
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
    await client.del(key);
  } catch (err) {
    console.error("Redis del error:", err);
  }
};

const flush = async () => {
  try {
    await client.flushdb();
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

/**
 * Thêm phần tử vào Sorted Set (ZSET)
 * @param {string} key - Tên key
 * @param {number} score - Điểm để sắp xếp
 * @param {string} member - Giá trị thành viên
 * @returns {Promise<number>} - Số phần tử được thêm mới (không tính updated)
 */
async function zadd(key, score, member) {
  try {
    return await client.zadd(key, score, member);
  } catch (err) {
    console.error("Redis zadd error:", err);
    return 0;
  }
}

/**
 * Xóa phần tử trong Sorted Set theo rank
 * @param {string} key - Tên key
 * @param {number} start - Vị trí bắt đầu
 * @param {number} stop - Vị trí kết thúc
 * @returns {Promise<number>} - Số phần tử bị xóa
 */
async function zremrangebyrank(key, start, stop) {
  try {
    return await client.zremrangebyrank(key, start, stop);
  } catch (err) {
    console.error("Redis zremrangebyrank error:", err);
    return 0;
  }
}

/**
 * Đặt thời gian sống (TTL) cho key
 * @param {string} key - Tên key
 * @param {number} seconds - Thời gian sống (giây)
 * @returns {Promise<boolean>} - True nếu thành công
 */
async function expire(key, seconds) {
  try {
    const result = await client.expire(key, seconds);
    return result === 1;
  } catch (err) {
    console.error("Redis expire error:", err);
    return false;
  }
}

/**
 * Lấy danh sách member trong Sorted Set theo khoảng score
 * @param {string} key - Tên key
 * @param {number} min - Điểm tối thiểu
 * @param {number} max - Điểm tối đa
 * @param {Object} options - { LIMIT: { offset, count } }
 * @returns {Promise<string[]>} - Mảng các member
 */
async function zrangebyscore(key, min, max, options = {}) {
  try {
    const args = [key, min, max];
    if (options.LIMIT) {
      args.push("LIMIT", options.LIMIT.offset, options.LIMIT.count);
    }
    return await client.zrangebyscore(...args);
  } catch (err) {
    console.error("Redis zrangebyscore error:", err);
    return [];
  }
}

/**
 * Lấy số phần tử trong Sorted Set
 * @param {string} key - Tên key
 * @returns {Promise<number>} - Số phần tử
 */
async function zcard(key) {
  try {
    return await client.zcard(key);
  } catch (err) {
    console.error("Redis zcard error:", err);
    return 0;
  }
}

initializeRedis();

module.exports = {
  set,
  get,
  exists,
  del,
  flush,
  zadd,
  zremrangebyrank,
  expire,
  zrangebyscore,
  zcard,
};
