import { existsSync } from 'fs'
import data from './data.js'

export const read = ({ route }) => {
  // check the cache manifest
  const cache = data.get({ key: route.file })

  // look for the entry file in the path
  if (!cache && !existsSync(route.file)) {
    throw Error(`url_not_found: ${route.url}`)
  }

  return cache ?? null
}
