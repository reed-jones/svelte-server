import { getParams, routesMatch } from './koaUtils.js'

it('parses out the parameters into an object', () => {
  const params = getParams('/authors/:author/posts/:post', '/authors/reed-jones/posts/getting-started')
  expect(params).toMatchObject({ author: 'reed-jones', post: 'getting-started' })
})

it('returns null if no parameters are detected', () => {
  const params = getParams('/authors/author/posts/post', '/authors/reed-jones/posts/getting-started')
  expect(params).toBe(null)
})

it('matches parameter routes with & without params', () => {
  const itMatches = routesMatch('/authors/:author/posts/:post', '/authors/reed-jones/posts/getting-started')
  expect(itMatches).toBe(true)
})

it('matches regardless of a trailing slash', () => {
  const itMatches1 = routesMatch('/authors/:author/', '/authors/reed-jones')
  expect(itMatches1).toBe(true)

  const itMatches2 = routesMatch('/authors/:author', '/authors/reed-jones/')
  expect(itMatches2).toBe(true)
})

it('returns false if the paths have a different number of segments', () => {
  const itMatches = routesMatch('/authors/:author/posts/:post', '/authors/reed-jones/posts')
  expect(itMatches).toBe(false)
})

it('returns false if the constant path segments are different', () => {
  const itMatches = routesMatch('/authors/:author/posts/:post', '/users/reed-jones/posts/getting-started')
  expect(itMatches).toBe(false)
})
