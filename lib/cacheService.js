const cache = {};

export const cacheService = {
  get: async (key) => {
    return cache[key] || null;
  },
  set: async (key, value, ttl) => {
    cache[key] = value;
  }
};
