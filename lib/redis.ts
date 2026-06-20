import { kv } from "@vercel/kv";

// Vercel KV sử dụng giao thức HTTP/REST API, 
// không bị chặn bởi cổng TCP 6379 tại Việt Nam.
// Cấu hình được tự động lấy từ biến môi trường KV_REST_API_URL và KV_REST_API_TOKEN.

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
  }
};

export default redisMock;