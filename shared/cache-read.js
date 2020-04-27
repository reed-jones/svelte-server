import { join, resolve } from "path"
import { existsSync } from "fs"
import data from "./data.js"

export default async function read({ route }) {
  // check the cache manifest
  const cache = data.get({ key: route.file })

  // look for the entry file in the path
  if (!cache && !existsSync(route.file)) {
    throw ReferenceError(`url_not_found: ${route.url}`)
  }

  return cache ?? null
}
