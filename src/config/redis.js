const { createClient } = require('@redis/client');

const client = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`, // URL kết nối Redis
});

client.on('connect', () => {
    console.log('Redis Connected!');
});

client.on('error', (error) => {
    console.error('Redis Error: ', error);
});

const set = async (key, value, expirationSeconds = 600) => {
    await client.set(key, JSON.stringify(value), { EX: expirationSeconds });
};

const get = async (key) => {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
};

const exists = async (key) => {
    return (await client.exists(key)) === 1;
};

async function initializeRedis() {
    try {
        await client.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
}

initializeRedis();

module.exports = {
    set,
    get,
    exists
};