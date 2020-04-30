import { put } from './filesystem.js'
import { generateFingerprint } from '../utilities/utils.js'

// not really a 'cache-write' anymore...
export const write = (name, code) => {
  const Fingerprint = generateFingerprint(name, code)
  put(Fingerprint, code)
  return Fingerprint
}
