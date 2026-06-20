import { kv } from "@vercel/kv";

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

// Export cả hai kiểu để Vercel không bao giờ báo lỗi module
export const redis = redisMock;
export default redisMock;
