/**
 * Basic cache implementation
 */
const cache = new Map()

export default {
  cache: () => [...cache.values()],
  has: ({ key }) => cache.has(key),
  get: ({ key }) => cache.get(key),
  getDep: ({ key }) => [...cache.values()].find(r => r.dependencies.includes(key)),
  hasDep: ({ key }) => [...cache.values()].some(r => r.dependencies.includes(key)),
  delete: ({ key }) => cache.delete(key),
  set: ({ key, ...rest }) => cache.set(key, { key, ...rest }),
  clear: () => cache.clear(),
}
