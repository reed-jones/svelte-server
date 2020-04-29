import { join } from 'path'
import crypto from 'crypto'

export const parseRawParams = (url, params = []) => [
  url.toLowerCase().replace(/\[-?(.+?)\]/g, (a,r) => params.push(r) && `:${r}`),
  params
]

export const createRoute = (root, file) => {
  const relative = file.replace(join(root, '/'), '')

  const kebabUrl = relative
    // splits folders & filenames
    .split('/')
    // removes index.svelte, .svelte
    .map(a => Pascal2Kebab(a).replace(/(\/?index)?\.svelte$/, ''))
    // removes any 'empty' sections (likely index.svelte)
    .filter(a => a)
    // join into a url
    .join('/')

  const [url, params] = parseRawParams(join('/', kebabUrl));

  return {
    url,
    params,
    file,
    relative,
  }
}

export const logging = log => {
  return log
    ? {
        log: (label, ...args) => console.log(`${`[${ label }]:`.padEnd(32)}`, ...args),
        warn: (label, ...args) => console.warn(`${`[${ label }]:`.padEnd(32)}`, ...args),
        error: (label, ...args) => console.error(`${`[${ label }]:`.padEnd(32)}`, ...args),
        start: label => (console.time(`${`[${ label }]:`.padEnd(32)}`), () => console.timeEnd(`${`[${ label }]:`.padEnd(32)}`)),
      }
    : {
        log: () => {},
        warn: () => {},
        error: () => {},
        start: () => () => {},
      }
}

export const generateFingerprint = (name, source) => {
  let hash = crypto.createHash('sha1')
  hash.update(Buffer.from(source))
  let sha = hash.digest('hex').substr(0, 12)
  let [filename, extension] = name
    .split('/')
    .slice(0)
    .reverse()
    .shift()
    .split('.')

   // extension should always be .js
  // in some cases, .svelte is what is incoming
  return `${filename}-${sha}.js`
}

/**
 * String Helpers
 */
export const Pascal2Snake = str =>
  str.replace(/[A-Z]/g, (letter, idx) =>
    idx ? `_${letter.toLowerCase()}` : letter.toLowerCase()
  )
export const Pascal2Kebab = str =>
  str.replace(/[A-Z]/g, (letter, idx) =>
    idx ? `-${letter.toLowerCase()}` : letter.toLowerCase()
  )
export const Snake2Pascal = str =>
  str.replace(/(^|_)[a-z]/g, letter => letter.toUpperCase().replace('_', ''))
export const Snake2Camel = str =>
  str.replace(/_[a-z]/g, letter => letter[1].toUpperCase())
export const Kebab2Pascal = str =>
  str.replace(/(^|-)[a-z]/g, letter => letter.toUpperCase().replace('-', ''))
export const Kebab2Camel = str =>
  str.replace(/-[a-z]/g, letter => letter[1].toUpperCase())
