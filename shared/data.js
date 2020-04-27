/**
 * Basic cache implementation
 */
let cache = new Map()

export default {
  cache: () => cache.values(),
  has: ({ key }) => cache.has(key),
  get: ({ key }) => cache.get(key),
  delete: ({ key }) => cache.delete(key),
  set: ({ key, ...rest }) => cache.set(key, { key, ...rest }),
  clear: () => cache.clear(),
}
