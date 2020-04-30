import { join, resolve } from 'path'
import { read } from '../shared/cache-read.js'
import bundle from '../shared/bundle.js'
import WebSocket from 'ws'
import { routesMatch } from '../utilities/utils.js'

const watcherUnlinked = ({ send }) => async path => send({ type: 'unlink' })
const watchedChanged = ({ send, options, url }) => async path => {
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
}

export const sendToSockets = sockets => payload => {
  const stringified = JSON.stringify(payload, null, 2)
  sockets.forEach(s => s.send(stringified))
}

export const connectWebsockets = ({ options, server, watcher }) => {
  const wss = new WebSocket.Server({ server })
  const sockets = new Set()
  const send = sendToSockets(sockets)

  let url = null

  wss.on('connection', (socket, req) => {
    sockets.add(socket)
    socket.send(JSON.stringify({ type: 'connected' }))
    socket.on('close', () => sockets.delete(socket))

    socket.on('message', data => {
      const { type, url: _url } = JSON.parse(data)
      switch (type) {
        case 'handshake':
          url = _url
          break
      }
    })
  })

  watcher.on('change', watchedChanged({ send, options, url }))
  watcher.on('unlink', watcherUnlinked({ send }))
}
