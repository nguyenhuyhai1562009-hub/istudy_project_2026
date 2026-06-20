import { kv } from "@vercel/kv";

// Vercel KV sử dụng giao thức HTTP/REST API
const redisMock = {
  lpush: async (key: string, value: string) => {
    try {
      return await kv.lpush(key, value);
    } catch (e) {
      console.warn("KV lpush failed, skipping:", e);
      return null;
    }
  },
  lrange: async (key: string, start: number, end: number) => {
    try {
      return await kv.lrange(key, start, end);
    } catch (e) {
      console.warn("KV lrange failed, returning empty:", e);
      return [];
    }
  },
};

// Export chính xác cả named export và default
export const redis = redisMock;
export default redisMock;