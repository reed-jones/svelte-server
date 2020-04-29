import { generateFingerprint, parseRawParams, Pascal2Kebab, Pascal2Snake, Kebab2Camel, Kebab2Pascal, Snake2Camel, Snake2Pascal } from './utils.js'

it('generates a unique deterministic fingerprint', () => {
  const f1 = generateFingerprint('test.txt', 'Hello World')
  expect(f1).toBe('test-0a4d55a8d778.js')
})

it('parses a url into its different parameters', () => {
  const [url, params] = parseRawParams('/Authors/[Author]/Posts/[-Post]/Tests/[-Test]')
  expect(url).toBe('/authors/:author/posts/:post/tests/:test')
  expect(params.length).toBe(3)
  expect(params).toEqual(['author', 'post', 'test'])
})

it('converts Pascal case to Kebab case', () => {
  expect(Pascal2Kebab("ThisIsATest")).toBe('this-is-a-test')
})

it('converts Pascal case to Snake case', () => {
  expect(Pascal2Snake("ThisIsATest")).toBe('this_is_a_test')
})

it('converts Kebab case to camel case', () => {
  expect(Kebab2Camel("this-is-a-test")).toBe('thisIsATest')
})

it('converts Kebab case to Pascal case', () => {
  expect(Kebab2Pascal("this-is-a-test")).toBe('ThisIsATest')
})

it('converts Kebab case to camel case', () => {
  expect(Snake2Camel("this_is_a_test")).toBe('thisIsATest')
})

it('converts Kebab case to Pascal case', () => {
  expect(Snake2Pascal("this_is_a_test")).toBe('ThisIsATest')
})
