import {
  Kebab2Camel,
  Kebab2Pascal,
  Pascal2Kebab,
  Pascal2Snake,
  Snake2Camel,
  Snake2Pascal,
  generateFingerprint,
  getParams,
  parseRawParams,
  routesMatch,
  createRoute,
  logging,
  renderTemplate
} from './utils.js'

it('generates a unique deterministic fingerprint', () => {
  const f1 = generateFingerprint('test.txt', 'Hello World')
  expect(f1).toBe('test-0a4d55a8d778.js')
})

it('parses a url into its different parameters', () => {
  const [url, params] = parseRawParams(
    '/Authors/[Author]/Posts/[-Post]/Tests/[-Test]'
  )
  expect(url).toBe('/authors/:author/posts/:post/tests/:test')
  expect(params.length).toBe(3)
  expect(params).toEqual(['author', 'post', 'test'])
})

it('converts Pascal case to Kebab case', () => {
  expect(Pascal2Kebab('ThisIsATest')).toBe('this-is-a-test')
})

it('converts Pascal case to Snake case', () => {
  expect(Pascal2Snake('ThisIsATest')).toBe('this_is_a_test')
})

it('converts Kebab case to camel case', () => {
  expect(Kebab2Camel('this-is-a-test')).toBe('thisIsATest')
})

it('converts Kebab case to Pascal case', () => {
  expect(Kebab2Pascal('this-is-a-test')).toBe('ThisIsATest')
})

it('converts Kebab case to camel case', () => {
  expect(Snake2Camel('this_is_a_test')).toBe('thisIsATest')
})

it('converts Kebab case to Pascal case', () => {
  expect(Snake2Pascal('this_is_a_test')).toBe('ThisIsATest')
})

it('parses out the parameters into an object', () => {
  const params = getParams(
    '/authors/:author/posts/:post',
    '/authors/reed-jones/posts/getting-started'
  )
  expect(params).toMatchObject({
    author: 'reed-jones',
    post: 'getting-started',
  })
})

it('returns null if no parameters are detected', () => {
  const params = getParams(
    '/authors/author/posts/post',
    '/authors/reed-jones/posts/getting-started'
  )
  expect(params).toBe(null)
})

it('matches parameter routes with & without params', () => {
  const itMatches = routesMatch(
    '/authors/:author/posts/:post',
    '/authors/reed-jones/posts/getting-started'
  )
  expect(itMatches).toBe(true)
})

it('matches regardless of a trailing slash', () => {
  const itMatches1 = routesMatch('/authors/:author/', '/authors/reed-jones')
  expect(itMatches1).toBe(true)

  const itMatches2 = routesMatch('/authors/:author', '/authors/reed-jones/')
  expect(itMatches2).toBe(true)
})

it('returns false if the paths have a different number of segments', () => {
  const itMatches = routesMatch(
    '/authors/:author/posts/:post',
    '/authors/reed-jones/posts'
  )
  expect(itMatches).toBe(false)
})

it('returns false if the constant path segments are different', () => {
  const itMatches = routesMatch(
    '/authors/:author/posts/:post',
    '/users/reed-jones/posts/getting-started'
  )
  expect(itMatches).toBe(false)
})
