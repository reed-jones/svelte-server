import {read} from './cache-read.js'
import data from './data.js'
import { join, resolve } from 'path'

beforeEach(() => {
  data.clear()
})

it('finds a route based one the "file" key', () => {
  // setup
  const route = { file: '/path/to/file.js' }
  data.set({ key: route.file, file: route.file })

  expect(read({ route }).key).toBe(route.file)
})

it('throws error accessing a not existing file', () => {
  const route = { file: '/path/to/file.js', url: '/some/path' }
  expect(() => read({ route })).toThrowError('url_not_found')
})

it('returns null if the file exists, but is not present in cache', () => {
  const route = { file: join(resolve(), 'package.json'), url: '/some/path' }
  expect(read({ route })).toBe(null)
})
