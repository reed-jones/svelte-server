import { get, put } from './filesystem.js'

it('can save & retrieve files from the in-memory filesystem', () => {
  const file = 'fs-test.txt'
  put(file, 'Hello World')
  const contents = get(file)
  expect(contents).toBe('Hello World');
});
