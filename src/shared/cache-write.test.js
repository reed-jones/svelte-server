import { write } from './cache-write.js'
import { get } from './filesystem.js'

it('generates the same fingerprint twice given the same content', () => {
  const fingerprintOne = write('text.txt', 'Hello World')
  const fingerprintTwo = write('text.txt', 'Hello World')
  expect(fingerprintOne).toBe(fingerprintTwo)
});


it('generates the different fingerprints given different content', () => {
  const fingerprintOne = write('text.txt', 'Hello World')
  const fingerprintTwo = write('text.txt', 'Hello, World!')
  expect(fingerprintOne).not.toBe(fingerprintTwo)
});

it('writes the file and is readable afterwards', () => {
  const fingerprintOne = write('text.txt', 'Hello World')
  const text = get(fingerprintOne)
  expect(text).toBe('Hello World')
})
