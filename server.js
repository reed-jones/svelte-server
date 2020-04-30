import Koa from 'koa'
import { join, resolve } from 'path'
import { logging } from './src/utilities/utils.js'
import {
  applyBundledJSMiddleware,
  applyPublicMiddleware,
  applyRouteContextMiddleware,
  applySSRMiddleware,
  applyWebsocketMiddleware,
  start,
} from './src/middleware/applyMiddlewareToApp.js'
import http from 'http'
import { existsSync } from 'fs'
import { setupWatcher } from './src/watcher.js'

const svelteServer = {
  setup: {
    // gets filled with config()
  },

  config(setup = null) {
    const inProduction = process.env.NODE_ENV === 'production'
    const publicFolder = join(resolve(), setup?.config?.public ?? setup?.public ?? 'public')
    const templateFile = join(
      resolve(),
      setup?.config?.template ?? setup?.template ?? 'index.template.ejs'
    )

    Object.assign(this.setup, {
      // User supplied props functions
      props: setup?.props ?? null,

      // hot module reloading
      hmr: !inProduction || setup?.config?.hmr || setup?.hmr,

      // show logging (defaults on in dev, off in prod)
      logging: logging(!inProduction || setup?.config?.logging || setup?.logging),

      // base path where all the svelte files are kept
      root: join(resolve(), setup?.config?.path ?? setup?.path ?? './pages'),

      // Port to listen on
      port: setup?.config?.port ?? setup?.port ?? null,

      // path to public folder... will be served statically
      public: existsSync(publicFolder) ? publicFolder : null,

      // html template file
      template: templateFile,

      // chokidar watch locations (just looks for svelte files)
      watch: setup?.config?.watch ?? setup?.watch ?? ['./pages', './components'],

      // import aliases (not yet enabled)
      aliases: setup?.config?.aliases ?? setup?.aliases ?? {
        ...(existsSync(join(resolve(), 'pages')) && {
          '@pages': './pages',
        }),
        ...(existsSync(join(resolve(), 'components')) && {
          '@components': './components',
        }),
      },

      // in prod, minify etc. NODE_ENV
      production: inProduction,

      // All found routes (will be updated via chokidar)
      routes: [],
    })

    return this
  },

  listen(port = this.setup?.port ?? null) {
    if (!Object.keys(this.setup).length) {
      this.config() // Initialize all default settings
    }

    // listen() port overrides all
    const options = this.setup
    options.port = port

    const app = new Koa()
    const server = http.createServer(app.callback())
    const watcher = setupWatcher({ options })

    ;[
      applyRouteContextMiddleware,
      applyPublicMiddleware,
      applySSRMiddleware,
      applyBundledJSMiddleware,
      applyWebsocketMiddleware,
      start,
    ].reduce((serverOptions, m) => (m(serverOptions), serverOptions), {
      app,
      options,
      server,
      watcher,
    })
  },
}

export default svelteServer
