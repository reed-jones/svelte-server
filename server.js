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
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { setupWatcher } from './src/watcher.js'
import { put } from './src/shared/filesystem.js'

const svelteServer = {
  setup: {/* gets filled with config() */},

  /**
   * Sets the configuration object for the svelte server.
   * Uses default settings if not called
   *
   * @param {object} setup optional user configuration file
   *
   * @return {this} returns the configured server... just call .listen()
   */
  config(setup = null) {
    const inProduction = process.env.NODE_ENV === 'production'
    const hmrEnabled = process.env.HMR_ENABLED === 'true'
    const publicFolder = join(resolve(), setup?.config?.public ?? setup?.public ?? 'public')
    const _templateName = setup?.config?.template ?? setup?.template ?? 'index.template.ejs';
    const _userTemplate = join(resolve(), _templateName);
    const templateFile = existsSync(_userTemplate)
      ? _userTemplate
      : join(resolve(), 'node_modules', 'svelte-server', 'index.template.ejs');
    const defaultAliases = {
      '@components': './components',
      '@layouts': './layouts',
      '@pages': './pages'
  }

    const mapAliases = aliases => {
      return Object.fromEntries(Object.entries(aliases).map(([alias, path]) => {
        if (existsSync(join(resolve(), path))) {
          return [alias, join(resolve(), path)];
        }
      }))
    }

    Object.assign(this.setup, {
      // User supplied props functions
      props: setup?.props ?? null,

      // hot module reloading
      hmr: !hmrEnabled || setup?.config?.hmr || setup?.hmr,

      // show logging (defaults on in dev, off in prod)
      logging: logging(!inProduction || setup?.config?.logging || setup?.logging),

      // base path where all the svelte files are kept
      root: join(resolve(), setup?.config?.pages ?? setup?.pages ?? './pages'),

      // Port to listen on
      port: setup?.config?.port ?? setup?.port ?? null,

      // path to public folder... will be served statically
      public: existsSync(publicFolder) ? publicFolder : null,

      // html template file
      template: templateFile,

      svelteOptions: setup?.config?.svelteOptions ?? setup?.svelteOptions ?? {},

      // chokidar watch locations (just looks for .svelte files) defaults to the main pages directory
      watch: setup?.config?.watch ?? setup?.watch ?? [setup?.config?.path ?? setup?.path ?? './pages'],

      // import aliases (not yet enabled)
      alias: mapAliases(setup?.config?.alias ?? setup?.alias ?? defaultAliases),

      // in prod, minify etc. NODE_ENV
      production: inProduction,

      // All found routes (will be updated via chokidar)
      routes: [],
    })

    return this
  },

  /**
   * Starts serving the svelte files
   *
   * @param {number?} port
   */
  async listen(port = this.setup?.port ?? null) {
    if (!Object.keys(this.setup).length) {
      this.config() // Initialize all default settings
    }

    if (this.setup.hmr) {
      const path = await import.meta.resolve('./client.js', import.meta.url)
      console.log({ path })
      const contents = readFileSync(path)

      put('hmr-client.js', contents)
    }

    /**
     * Base 'pages' path is the only required file.
     * Can be renamed, but needs to exist in some form
     */
    // TODO: --init command
    // if (!existsSync(this.setup.root)) {
    //   mkdirSync(this.setup.root)
    // }

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
