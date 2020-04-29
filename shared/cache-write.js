import crypto from 'crypto'
import { join, resolve } from 'path'
import fs from 'fs'
import data from './data.js'
import { put } from './filesystem.js'
import chalk from 'chalk'

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

  return `${filename}-${sha}.js`
}

export default async function write({ file, ssr, dom, name, iife, dependencies }, { options }) {

  // If the cache key was supplied, then don't bother with fingerprinting
  const stopWriting = options.logging.start(chalk.yellow('Caching'), name)

  // need to base64 encode it for the SSR here, so that when we need to
  // we can simply call import(code) at have it available
  const importCode = `data:text/javascript;base64,${Buffer.from(ssr).toString('base64')}`

  const SSRFingerprint = generateFingerprint(name, importCode)
  const DOMFingerprint = generateFingerprint(name, dom)
  const IIFEFingerprint = generateFingerprint(name, iife)


  put(SSRFingerprint, importCode)
  put(DOMFingerprint, dom)
  put(IIFEFingerprint, iife)

  const cacheData = {
    key: file,
    ssr: SSRFingerprint,
    dom: DOMFingerprint,
    iife: IIFEFingerprint,
    file,
    name,
    dependencies
  }

  // Save to cache manifest
  data.set(cacheData)

  stopWriting()

  return cacheData
}
