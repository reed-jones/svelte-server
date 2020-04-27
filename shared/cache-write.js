import crypto from "crypto"
import { join, resolve } from "path"
import fs from "fs"
import data from "./data.js"
import { put } from "./filesystem.js"
import chalk from "chalk"

const generateFingerprint = (name, mode, source) => {
  let hash = crypto.createHash("sha1")
  hash.update(Buffer.from(source))
  let sha = hash.digest("hex").substr(0, 12)
  let [filename, extension] = name
    .split("/")
    .slice(0)
    .reverse()
    .shift()
    .split(".")

  return `${filename}-${mode}-${sha}.js`
}

export default async function write({ file, ssr, dom, name, iife }, options) {
  // If the cache key was supplied, then don't bother with fingerprinting
  const stopWriting = options.logging.start(`[${chalk.yellow('Caching')}]: ${name}`)
  const SSRFingerprint = generateFingerprint(name, "ssr", ssr)
  const DOMFingerprint = generateFingerprint(name, "dom", dom)
  const IIFEFingerprint = generateFingerprint(name, "iife", iife)

  // write file to disk. so it can be 'import' ed
  fs.writeFileSync(join(resolve(), SSRFingerprint), ssr)
  const { default: renderer } = await import(join(resolve(), SSRFingerprint))
  fs.unlinkSync(join(resolve(), SSRFingerprint))

  const out = renderer.render({})

  put(SSRFingerprint.replace(".js", ".json"), JSON.stringify(out))
  put(DOMFingerprint, dom)
  put(IIFEFingerprint, iife)

  const cacheData = {
    key: file,
    ssr: SSRFingerprint.replace(".js", ".json"),
    dom: DOMFingerprint,
    iife: IIFEFingerprint,
    file,
    name,
  }

  // Save to cache manifest
  data.set(cacheData)

  stopWriting()

  return cacheData
}
