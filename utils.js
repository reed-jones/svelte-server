import { join } from 'path'
import crypto from 'crypto'
import { readFileSync } from 'fs'
import ejs from 'ejs'

import { get } from './shared/filesystem.js'

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


/**
*
* @param {object} file
* @param {string} file.ssr base64 encoded compiled ssr template
* @param {string} file.dom path to module import file
* @param {string} file iife path to no-module import file
* @param {route} route
* @param {object} route.props all props (user supplied from setup.js & url params)
* @param {object} options middleware options
*/
export const renderTemplate = async ({ ssr, dom, iife }, { props }, options) => {
 // Get bundled SSR details from memory
 const { default: renderer } = await import(get(ssr))

 // Render cached Svelte SSR template with current props
 const out = renderer.render(props)

 const script = [
   // hydrate client side props
   props &&
     `<script>window.__SVELTE_PROPS__=${JSON.stringify(props)}</script>`,

   // modern module script
   `<script src=${join('/', '_js', `${dom}`)} type=module></script>`,

   // no-module script (older browsers and things...)
   `<script src=${join('/', '_js', `${iife}`)} nomodule></script>`,

   // hot reloading... ok I know its not the webpack HMR, but still
   options.hmr && `<script src=/@hmr-client type=module></script>`,
 ].join('')

 // compile template & return the result
 // TODO: in production, just read the template once & cache it?
 return ejs.render(
   readFileSync(options.template, 'utf-8'),
   {
     head: out.head,
     style: `<style>${out.css.code}</style>`,
     script,
     html: out.html,
   },
   {
     rmWhitespace: true,
   }
 )
}


export const routesMatch = (r1, r2) => {
  // break into url segments
  r1 = r1.split('/').filter(a => a)
  r2 = r2.split('/').filter(a => a)

  if (r1.length !== r2.length) {
    // the routes have a different number of segments & can't match
    // e.g.   /author/:author/posts/:post => 4 segments
    //        /home => 1 segment
    return false
  }

  // if the segment starts with ':' then its a paramter and must by matched dynamically
  // (no restrictions). if it does not, it must be the exact same
  // e.g.   /authors/:author/posts/:post
  //        /authors/testing/posts/whatever
  return r1.every((cur, idx) => cur.startsWith(':') || cur === r2[idx])
}
export const getParams = (r1, r2) => {
  r1 = r1.split('/').filter(a => a)
  r2 = r2.split('/').filter(a => a)
  return r1.reduce(
    (acc, cur, idx) =>
      cur.startsWith(':') ? { ...acc, [cur.slice(1)]: r2[idx] } : acc,
    null
  )
}
