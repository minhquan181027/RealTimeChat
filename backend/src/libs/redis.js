import { createClient } from "redis";

const redis = createClient({
    url: process.env.REDIS_URL,
    socket: {
        // Tự động reconnect nếu rớt mạng, tránh làm crash app
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
});

redis.on("error", (err) => console.error("Redis Error:", err.message));
redis.on("ready", () => console.log("Redis connected successfully!"));

export const connectRedis = async () => {
    if (!redis.isOpen) {
        await redis.connect();
    }
};

export default redis;