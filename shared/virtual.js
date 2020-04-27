import path from "path"

const PREFIX = `\0virtual:`

export default function virtual(modules) {
  //   if (modules.ssr) {
  //     console.log({ modules })
  //   }

  // Faster in testing
  const resolvedIds = Object.keys(modules).reduce((acc, id) => {
    return acc.set(path.resolve(id.replace('/NavBar.svelte', 'pages/NavBar.svelte')), modules[id])
  }, new Map())

    console.log(resolvedIds)


  return {
    name: "virtual",

      resolveId(id, importer) {

        //   if (id === './NavBar.svelte') {
        //       id = 'pages/NavBar.svelte'
        //     }
            console.log(id)
        if (id in modules) {
          console.log("RESOLVE_1 " + id)
        return PREFIX + id
      }

    //   if (id === "./NavBar.svelte") {
    //     id = "NavBar.svelte"
    //   }

      if (importer) {
        // eslint-disable-next-line no-param-reassign
        if (importer.startsWith(PREFIX)) {
          importer = importer.slice(PREFIX.length)
        }

        const resolved = path.resolve(path.dirname(importer), id)

        // console.log({ resolved, importer, id })

        if (resolvedIds.has(resolved)) {
          console.log("RESOLVING_2 " + id)
            return PREFIX + resolved
        } else {
            // return PREFIX + path.resolve('pages', path.dirname(importer), id)
        }
        // return PREFIX + id
        // }
      }
    },

    load(id) {
      console.log("LOADING " + id)
      if (id.startsWith(PREFIX)) {
        // eslint-disable-next-line no-param-reassign
        id = id.slice(PREFIX.length)

        return id in modules ? modules[id] : resolvedIds.get(id)
      }
    },
  }
}
