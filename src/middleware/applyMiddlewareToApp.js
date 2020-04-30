import portFinder from 'portfinder'
import { join, resolve } from 'path'
import { read } from '../shared/cache-read.js'
import bundle from '../shared/bundle.js'
import chalk from 'chalk'
import WebSocket from 'ws'
import { routesMatch } from '../utilities/utils.js'
import {
  affixRouteToContextMiddleware,
  serveHMRClient,
  serveBundledJsFiles,
  serveRenderedHTML,
  serverPublicFolder,
} from './middleware.js'
import { connectWebsockets } from './websockets.js'

export const applyRouteContextMiddleware = ({ app, options }) => {
  app.use(affixRouteToContextMiddleware({ app, options }))
}

export const applyWebsocketMiddleware = ({ app, options, server, watcher }) => {
  if (!options.hmr) {
    return
  }

  app.use(serveHMRClient())
  connectWebsockets({ options, server, watcher })
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
