import { join } from "path"
import { readdirSync, statSync } from "fs"

export const walkSync = (dir, fileList = null) => {
  const files = readdirSync(dir)
  fileList = fileList ?? []
  files.forEach(file => {
    if (statSync(join(dir, file)).isDirectory()) {
      fileList = walkSync(join(dir, file, "/"), fileList)
    } else {
      fileList.push(join(dir, file))
    }
  })
  return fileList
}

export const createRoute = (root, file) => {
  const relative = file.replace(join(root, "/"), "")

  const kebabUrl = relative
    // splits folders & filenames
    .split("/")
    // removes index.svelte, .svelte
    .map(a => Pascal2Kebab(a).replace(/(\/?index)?\.svelte$/, ""))
    // removes any 'empty' sections (likely index.svelte)
    .filter(a => a)
    // join into a url
    .join("/")

  return {
    url: join("/", kebabUrl),
    file: file,
    relative,
  }
}

export const findRoutes = root => walkSync(root).map(file => createRoute(root, file))

export const logging = log => {
  return log
    ? {
        log: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        start: name => (console.time(name), () => console.timeEnd(name)),
      }
    : {
        log: () => {},
        warn: () => {},
        error: () => {},
        start: () => () => {},
      }
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
  str.replace(/(^|_)[a-z]/g, letter => letter.toUpperCase().replace("_", ""))
export const Snake2Camel = str =>
  str.replace(/_[a-z]/g, letter => letter[1].toUpperCase())
export const Kebab2Pascal = str =>
  str.replace(/(^|-)[a-z]/g, letter => letter.toUpperCase().replace("-", ""))
export const Kebab2Camel = str =>
  str.replace(/-[a-z]/g, letter => letter[1].toUpperCase())
