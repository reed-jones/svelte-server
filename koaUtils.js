import portFinder from "portfinder"
import { readFileSync } from "fs"
import { join } from "path"
import ejs from "ejs"
import { get } from "./shared/filesystem.js"
import serve from "koa-static"
import read from "./shared/cache-read.js"
import bundle from "./shared/bundle.js"
import chalk from "chalk"

// If the url starts with '/_js/' we can assume it was injected by us, and
// serve it from the in memory filesystem
export const dynamicallyAddJs = (app, options) =>
  app.use(async (ctx, next) => {
    if (!ctx.url.startsWith("/_js/")) {
      return next()
    }
    const cacheTimer = options.logging.start(
      `[${chalk.green("From cache")}]: ${ctx.url}`
    )

    const name = ctx.url.replace("/_js/", "") // remove '_js' flag
    const file = get(name)

    cacheTimer()

    ctx.type = "js"
    ctx.body = file
  })

// serve the SSR'd page, and pass the dynamic js arguments
// to the compiled template
export const serveSSRPage = (app, options) =>
  app.use(async (ctx, next) => {
    // lookup route by url
    const route = options.routes.find(route => route.url === ctx.url)

    if (!route) {
      return next()
    }

    const ssrTimer = options.logging.start(
      `[${chalk.green("SSR")}]: ${ctx.url}`
    )
    // read file details from cache, or bundle if unavailable
    let file = (await read({ route })) ?? (await bundle({ route }, options))

    // Get bundled SSR details from memory
    const out = JSON.parse(get(file.ssr))

    // Prefix the script tag with '/_js/' so we know which ones to dynamically replace
    const domPath = join("/", "_js", `${file.dom}`)
    const iifePath = join("/", "_js", `${file.iife}`)

    // compile template & return the result
    const html = ejs.render(readFileSync(options.template, "utf-8"), {
      head: out.head,
      style: `<style>${out.css.code}</style>`,
      script: `<script src=${domPath} type=module></script><script nomodule src=${iifePath}></script>`,
      html: out.html,
    })

    ssrTimer()

    ctx.type = "html"
    ctx.body = html
  })

// serve the public folder if available
export const servePublicFolder = (app, options) =>
  options.public && app.use(serve(options.public))

// start listening on a port, and don't quit!
export const start = (app, options) => {
  const done = port =>
    console.log(`Listening on ${chalk.yellow("http://localhost:" + port)}`)
  const port = options.port
  if (port) {
    app.listen(port, () => done(port))
  } else {
    portFinder
      .getPortPromise()
      .then(port => app.listen(port, done(port)))
      .catch(err => console.error("Could not find a free port"))
  }
}
