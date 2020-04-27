#!/usr/bin/env node
import Koa from 'koa'
import { join, resolve } from 'path'
import minimist from 'minimist'
import { logging, createRoute } from './utils.js'
import {
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
  template: join(resolve(), args.template ?? 'index.template.html'),

  // path to public folder... will be served statically
  public: args.public ? join(resolve(), args.public) : null,

  // generated temp output location
  output: join(resolve(), '.generated'),

  // port to start server on. defaults to first available
  port: args.port ?? null,

  // All found routes (will be updated via chokidar)
  routes: [],
}

const watcher = chokidar.watch(join(options.root, '**/*.svelte'))

watcher
  .on('unlink', path => {
    options.logging.log(
      `[${chalk.red('File Removed')}]: ${path.replace(options.root, '')}`
    )
    // delete from routes
    const idx = options.routes.findIndex(file => file.file === path)
    options.routes.splice(idx, 1)
    // delete from cache
    data.delete({ key: path })
  })
  .on('add', path => {
    options.logging.log(
      `[${chalk.blue('File Added')}]:   ${path.replace(options.root, '')}`
    )
    options.routes.push(createRoute(options.root, path))
  })
  .on('change', key => {
    options.logging.log(
      `[${chalk.green('File Updated')}]: ${key.replace(options.root, '')}`
    )
    data.delete({ key })
  })

const app = new Koa()
const server = http.createServer(app.callback())

const serverOptions = [
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
