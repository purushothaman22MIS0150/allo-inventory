// src/lib/redis.ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  client.on("error", (err) => {
    console.error("Redis error:", err);
  });
  return client;
}

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = createRedisClient();
  }
  return globalForRedis.redis;
}

// Distributed lock using SET NX PX
export async function acquireLock(
  key: string,
  ttlMs: number = 5000
): Promise<string | null> {
  const redis = getRedis();
  const token = `${Date.now()}-${Math.random()}`;
  const result = await redis.set(`lock:${key}`, token, "PX", ttlMs, "NX");
  return result === "OK" ? token : null;
}

export async function releaseLock(key: string, token: string): Promise<void> {
  const redis = getRedis();
  // Lua script for atomic check-and-delete
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, `lock:${key}`, token);
}
