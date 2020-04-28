#!/usr/bin/env node
import Koa from 'koa'
import { join, resolve } from 'path'
import minimist from 'minimist'
import { logging, createRoute } from './utils.js'
import {
  parseUrlParams,
  servePublicFolder,
  serveSSRPage,
  dynamicallyAddJs,
  startWebSocket,
  start,
} from './koaUtils.js'
import chokidar from 'chokidar'
import data from './shared/data.js'
import chalk from 'chalk'
import http from 'http'
import { existsSync } from 'fs'

const args = minimist(process.argv.slice(2))

const root = join(resolve(), args.path ?? './pages')

const options = {
  // in prod, minify etc
  production: !args.dev,

  // show logging (defaults on in dev, off in prod)
  logging: logging(!!args.dev || !!args.logging),

  // hot module reloading
  hmr: args.hmr,

  // base path where all the svelte files are kept
  root,

  // html template file
  template: join(resolve(), args.template ?? 'index.template.ejs'),

  // path to public folder... will be served statically
  public: args.public ? join(resolve(), args.public) : null,

  // generated temp output location
  output: join(resolve(), '.generated'),

  // port to start server on. defaults to first available
  port: args.port ?? null,

  // All found routes (will be updated via chokidar)
  routes: [],

  userConfig: existsSync(join(resolve(), 'setup.js'))
    ? import(join(resolve(), 'setup.js')).then(a => a.default)
    : Promise.resolve(null),
}

const watcher = chokidar.watch(
  join(resolve(), '(pages|components)', '**/*.svelte')
)

watcher
  .on('unlink', path => {
    options.logging.log(
      `[${chalk.red('File Removed')}]: ${path.replace(options.root, '')}`
    )

    // delete from routes
    const idx = options.routes.findIndex(file => file.file === path)
    if (idx >= 0) {
      options.routes.splice(idx, 1)
      // delete from cache
      data.delete({ key: path })
    }
  })
  .on('add', path => {
    options.logging.log(
      `[${chalk.blue('File Added')}]: ${path.replace(options.root, '')}`
    )
    if (path.startsWith(options.root)) {
      options.routes.push(createRoute(options.root, path))
    }
  })
  .on('change', key => {
    options.logging.log(
      `[${chalk.green('File Updated')}]: ${key.replace(options.root, '')}`
    )
    const parentOrChild = [...data.cache()].find(d =>
      d.dependencies.includes(key)
    )
    if (parentOrChild) {
      data.delete({ key: parentOrChild.key })
    }
  })


// Wait for the user config to be loaded before starting the app
options.userConfig.then(async a => {
  options.userConfig = a
  const app = new Koa()
  const server = http.createServer(app.callback())

  const serverOptions = [
    parseUrlParams,
    servePublicFolder,
    serveSSRPage,
    dynamicallyAddJs,
    startWebSocket,
    start,
  ].reduce((serverOptions, m) => (m(serverOptions), serverOptions), {
    app,
    options,
    server,
    watcher,
  })
})
