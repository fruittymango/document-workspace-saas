import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const LOCK_TTL = 30;
const RESULT_TTL = 60 * 60 * 24;

export async function beginIdempotentRequest(key: string) {
  const resultKey = `idem:result:${key}`;
  const lockKey = `idem:lock:${key}`;

  const cached = await redis.get<{ status: number; body: unknown }>(resultKey);
  if (cached) {
    return { state: "completed" as const, result: cached };
  }

  const acquired = await redis.set(lockKey, "1", { nx: true, ex: LOCK_TTL });
  if (!acquired) {
    return { state: "in_progress" as const };
  }

  return { state: "acquired" as const };
}

export async function completeIdempotentRequest(
  key: string,
  status: number,
  body: unknown,
) {
  await redis.set(`idem:result:${key}`, { status, body }, { ex: RESULT_TTL });
  await redis.del(`idem:lock:${key}`);
}

export async function abortIdempotentRequest(key: string) {
  await redis.del(`idem:lock:${key}`);
}
