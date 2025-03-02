// src/services/redisClient.js
const Redis = require('ioredis');

class RedisClient {
  constructor() {
    if (!RedisClient.instance) {
      this.client = new Redis({
        host: 'localhost',
        port: 6379,
      });
      RedisClient.instance = this;
    }
    return RedisClient.instance;
  }

  async setKey(key, value) {
    try {
      await this.client.set(key, value);
      console.log(`Key "${key}" set successfully`);
    } catch (err) {
      console.error('Error setting key:', err);
      throw err;
    }
  }

  async getKey(key) {
    try {
      const result = await this.client.get(key);
      console.log(`Value of "${key}":`, result);
      return result;
    } catch (err) {
      console.error('Error getting key:', err);
      throw err;
    }
  }
}

module.exports = new RedisClient();

// Sample usage of the RedisClient
// const redisClient = require('./services/redisClient');

// (async () => {
//   try {
//     await redisClient.setKey('mykey', 'Hello Redis!');
//     const value = await redisClient.getKey('mykey');
//     console.log('Retrieved value:', value);
//   } catch (err) {
//     console.error('Error in Redis operations:', err);
//   }
// })();