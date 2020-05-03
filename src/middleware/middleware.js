import { createReadStream } from 'fs'
import { join, resolve } from 'path'
import { get } from '../shared/filesystem.js'
import { read } from '../shared/cache-read.js'
import bundle from '../shared/bundle.js'
import data from '../shared/data.js'
import chalk from 'chalk'
import { renderTemplate, routesMatch, getParams } from '../utilities/utils.js'

/** Static File Serving Middleware */
export { default as serverPublicFolder } from 'koa-static'

export const affixRouteToContextMiddleware = ({ app, options }) => async (
  ctx,
  next
) => {
  // find & set the current route
  app.context.route = options.routes.find(route => routesMatch(route.url, ctx.url))

  if (ctx.route) {
    // if a route was found, get parsed params
    const params = getParams(ctx.route.url, ctx.url)

    // user supplied setup.js callback function, this return value is used to hydrate the props
    // of the component. If no function is provided, just resolve the (possibly empty) props
    // ctx.route.props
    const propCallback =
      options.props?.[ctx.route.url] ??
      Promise.resolve.bind(Promise)
    app.context.route.props = await propCallback(params)
  }

  // all following routes will (or will not) have ctx.route attached
  return next()
}

export const serveHMRClient = () => async (ctx, next) => {
  if (ctx.url !== '/@hmr-client') {
    return next()
  }

  ctx.type = 'js'
  ctx.body = createReadStream('../../client.js')
}

export const serveBundledJsFiles = ({ options }) => async (ctx, next) => {
  if (!ctx.url.startsWith('/_js/')) {
    return next()
  }

  const cacheTimer = options.logging.start(chalk.green('From cache'), ctx.url)

  const name = ctx.url.replace('/_js/', '') // remove '_js' flag
  const file = get(name)

  ctx.type = 'js'
  ctx.body = file

  cacheTimer()
}

export const serveRenderedHTML = ({ options }) => async (ctx, next) => {
  // lookup route by url
  if (!ctx.route) {
    return next()
  }

  if (
    ctx.header.connection === 'Upgrade' ||
    ctx.header.upgrade === 'websocket'
  ) {
    return next()
  }

  const ssrTimer = options.logging.start(chalk.green('SSR'), ctx.url)

  // read file details from cache, or bundle if unavailable
  // routes with params cannot be cached (currently)
  try {
    const file = read({ route: ctx.route }) ?? (await bundle({ route: ctx.route }, options))

    ctx.type = 'html'
    ctx.body = await renderTemplate(file, ctx.route.props, options)
  } catch (err) {
    // just like refresh everything I guess
    // should only be failing to bundle in development anyways?
    if (!options.production) {
      options.logging.error("Failed to render template", err)
      data.clear()

      ctx.status = 500
      ctx.type = 'html'
      ctx.body = `
      <h1>Well that wasn't supposed to happen...</h1>
      <script>setTimeout(() => {location.reload()},2500)</script>
      `
    }
  }

  ssrTimer()
}
