const socket = new WebSocket(`ws://${location.host}`)
const log = msg =>
  console.log(
    `%c[svelte-server]%c ${msg}`,
    'background: darkslategray; color: white; display: block;',
    ''
  )

const send = payload => {
  const stringified = JSON.stringify(payload, null, 2)
  socket.send(stringified)
}

log('HOT client loaded')

socket.addEventListener('message', async ({ data }) => {
  const { type, path, name } = JSON.parse(data)

  switch (type) {
    case 'connected':
      log(`connected`)
      send({ type: 'handshake', url: location.pathname })
      break
    case 'change':
      log(`File changed: ${name}`)
      const { default: component } = await import(`/_js/${path}`)
      new component({ target: document.body, hydrate: true, props: window.__SVELTE_PROPS__ })
      break
    case 'unlink':
      log(`File removed: ${name}`)
      location.reload()
      break
  }
})

socket.addEventListener('close', () => {
  log(`server connection lost. polling for restart...`)
  setInterval(() => {
    new WebSocket(`ws://${location.host}`).addEventListener('open', () => {
      location.reload()
    })
  }, 1000)
})
