import data from './data.js'

beforeEach(() => {
  data.clear()
})

afterEach(() => {
  // data.clear()
})

it('can set & get data from the cache', () => {
  data.set({ key: 'test-key', extras: 'random-string' })
  const item = data.get({ key: 'test-key' })
  expect(item.extras).toBe('random-string')
})

it('returns null if an key cannot be found', () => {
  data.set({ key: 'test-key-2', extras: 'random-string' })
  const item = data.get({ key: 'test-key' })
  expect(item).toBe(null)
})

it('can set multiple keys', () => {
  data.set({ key: 'test-key-1', value: 1 })
  data.set({ key: 'test-key-2', value: 2 })
  expect(data.cache().length).toBe(2)
})

it('it can verify an item exists by key', () => {
  data.set({ key: 'test-1' })
  expect(data.has({ key: 'test-1' })).toBe(true)
})

it('gets an item by checking the dependencies', () => {
  data.set({ key: 'one', dependencies: ['two', 'three'], value: 4 })
  expect(data.getDep({ key: 'three' }).value).toBe(4)
})

it('returns null when an item cannot be found by checking the dependencies', () => {
  data.set({ key: 'one', dependencies: ['two', 'three'], value: 4 })
  expect(data.getDep({ key: 'five' })).toBe(null)
})

it('deletes an item by key', () => {
  data.set({ key: 'test', value: 5 })
  data.delete({ key: 'test' })
  expect(data.has({ key: 'test' })).toBe(false)
})

it('clears the cache when requested', () => {
  data.set({ key: 'one' })
  data.set({ key: 'two' })
  data.set({ key: 'three' })
  data.set({ key: 'four' })
  data.clear()
  expect(data.cache().length).toBe(0)
})

it('checks an item exists by checking the dependencies', () => {
  data.set({ key: 'one', dependencies: ['two', 'three'], value: 4 })
  expect(data.hasDep({ key: 'three' })).toBe(true)
})

it('can overwrite values with the same key', () => {
  data.set({ key: 'test-key-1', value: 1 })
  data.set({ key: 'test-key-1', value: 2 })
  const result = data.get({ key: 'test-key-1' }).value
  expect(result).toBe(2)
})
