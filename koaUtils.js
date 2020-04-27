import portFinder from 'portfinder'
import { readFileSync, createReadStream } from 'fs'
import { join, resolve } from 'path'
import ejs from 'ejs'
import { get } from './shared/filesystem.js'
import serve from 'koa-static'
import read from './shared/cache-read.js'
import bundle from './shared/bundle.js'
import chalk from 'chalk'
import WebSocket from 'ws'

export const startWebSocket = ({ app, options, server, watcher }) => {
  if (!options.hmr) {
    return
  }

  app.use(async (ctx, next) => {
    if (ctx.url !== '/@hmr-client') {
      return next()
    }

    ctx.type = 'js'
    ctx.body = createReadStream(
      join(resolve(), 'node_modules', 'svelte-server', 'client.js')
    )
  })

  const wss = new WebSocket.Server({ server })
  const sockets = new Set()

  let url = null

  const send = payload => {
    const stringified = JSON.stringify(payload, null, 2)
    sockets.forEach(s => s.send(stringified))
  }

  wss.on('connection', (socket, req) => {
    sockets.add(socket)
    socket.send(JSON.stringify({ type: 'connected' }))
    socket.on('close', () => {
      sockets.delete(socket)
    })

    socket.on('message', data => {
      const { type, url: _url } = JSON.parse(data)
      switch (type) {
        case 'handshake':
          url = _url
          break
      }
    })
  })

  watcher.on('change', async path => {
    if (!url) {
      return console.log('No URL...')
    }

    const route = options.routes.find(route => route.url === url)

    // need to re-compile current route to check updated dependency tree
    const file = (await read({ route })) ?? (await bundle({ route }, options))

    // only send updates of required
    if (file.dependencies.includes(path)) {
      send({ type: 'change', path: file.dom, name: path.replace(join(resolve(), '/'), '') })
    }
  })

  watcher.on('unlink', async path => {
    send({ type: 'unlink' })
  })
}

// If the url starts with '/_js/' we can assume it was injected by us, and
// serve it from the in memory filesystem
export const dynamicallyAddJs = ({ app, options }) =>
  app.use(async (ctx, next) => {
    if (!ctx.url.startsWith('/_js/')) {
      return next()
    }
    const cacheTimer = options.logging.start(
      `[${chalk.green('From cache')}]: ${ctx.url}`
    )

    const name = ctx.url.replace('/_js/', '') // remove '_js' flag
    const file = get(name)

    cacheTimer()

    ctx.type = 'js'
    ctx.body = file
  })

// serve the SSR'd page, and pass the dynamic js arguments
// to the compiled template
export const serveSSRPage = ({ app, options }) =>
  app.use(async (ctx, next) => {
    // lookup route by url
    const route = options.routes.find(route => route.url === ctx.url)

    if (!route) {
      return next()
    }

    if (
      ctx.header.connection === 'Upgrade' ||
      ctx.header.upgrade === 'websocket'
    ) {
      return next()
    }

    const ssrTimer = options.logging.start(
      `[${chalk.green('SSR')}]: ${ctx.url}`
    )
    // read file details from cache, or bundle if unavailable
    let file = (await read({ route })) ?? (await bundle({ route }, options))

    // Get bundled SSR details from memory
    const out = JSON.parse(get(file.ssr))

    // Prefix the script tag with '/_js/' so we know which ones to dynamically replace
    const domPath = join('/', '_js', `${file.dom}`)
    const iifePath = join('/', '_js', `${file.iife}`)

    const script = [
      `<script src=${domPath} type=module></script>`,
      options.hmr && `<script src=/@hmr-client type=module></script>`,
      `<script nomodule src=${iifePath}></script>`,
    ].join('')

    // compile template & return the result
    const html = ejs.render(readFileSync(options.template, 'utf-8'), {
      head: out.head,
      style: `<style>${out.css.code}</style>`,
      script,
      html: out.html,
    })

    ssrTimer()

    ctx.type = 'html'
    ctx.body = html
  })

// serve the public folder if available
export const servePublicFolder = ({ app, options }) =>
  options.public && app.use(serve(options.public))

// start listening on a port, and don't quit!
export const start = ({ app, options, server }) => {
  const done = () => {
    console.log(
      `Listening on ${chalk.yellow(
        'http://localhost:' + server.address().port
      )}`
    )
  }
  const port = options.port
  if (port) {
    server.listen(port, done)
  } else {
    portFinder
      .getPortPromise()
      .then(port => {
        // app.listen(port, done(port))
        server.listen(port, done)
      })
      .catch(err => console.error('Could not find a free port'))
  }
}
