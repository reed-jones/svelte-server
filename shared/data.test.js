import data from './data.js'

test('can set & get data from the cache', () => {
  data.set({ key: 'test-key', extras: 'random-string' })
  const item = data.get({ key: 'test-key' })
  expect(item.extras).toBe('random-string')
})

test('it can set multiple keys', () => {
    data.set({ key: 'test-key-1', value: 1 })
    data.set({ key: 'test-key-2', value: 2 })
    expect(data.cache().length).toBe(2)
})

test('it can overwrite values with the same key', () => {
    data.set({ key: 'test-key-1', value: 1 })
    data.set({ key: 'test-key-1', value: 2 })
    const result = data.get({ key: 'test-key-1' }).value
    expect(result).toBe(2)
})
