import portFinder from 'portfinder'
import { join, resolve } from 'path'
import { read } from './shared/cache-read.js'
import bundle from './shared/bundle.js'
import chalk from 'chalk'
import WebSocket from 'ws'
import { routesMatch } from './utils.js'
import {
  affixRouteToContextMiddleware,
  serveHMRClient,
  serveBundledJsFiles,
  serveRenderedHTML,
  serverPublicFolder,
} from './middleware.js'

export const applyRouteContextMiddleware = ({ app, options }) => {
  app.use(affixRouteToContextMiddleware({ app, options }))
}

export const applyWebsocketMiddleware = ({ app, options, server, watcher }) => {
  if (!options.hmr) {
    return
  }

  app.use(serveHMRClient())

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

    const route = options.routes.find(route => routesMatch(route.url, url))

    // need to re-compile current route to check updated dependency tree
    const file = read({ route }) ?? (await bundle({ route }, options))

    // only send updates of required
    if (file.dependencies.includes(path)) {
      send({
        type: 'change',
        path: file.dom,
        name: path.replace(join(resolve(), '/'), ''),
      })
    }
  })

  watcher.on('unlink', async path => {
    send({ type: 'unlink' })
  })
}

export const applyBundledJSMiddleware = ({ app, options }) => {
  app.use(serveBundledJsFiles({ options }))
}

export const applySSRMiddleware = ({ app, options }) => {
  app.use(serveRenderedHTML({ options }))
}

export const applyPublicMiddleware = ({ app, options }) => {
  if (!options.public) {
    return
  }

  app.use(serverPublicFolder(options.public))
}

// start listening on a port, and don't quit!
export const start = async ({ options, server }) => {
  try {
    const port = options.port ?? (await portFinder.getPortPromise())
    server.listen(port, () => {
      const port = server.address().port
      console.log(`Listening on ${chalk.yellow(`http://localhost:${port}`)}`)
    })
  } catch {
    console.error(
      'Could not find a free port. Svelte Server has failed to start.'
    )
  }
}
