import * as rollup from 'rollup'
import { write } from './cache-write.js'
import terser from 'rollup-plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import sveltePlugin from 'rollup-plugin-svelte'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import chalk from 'chalk'
import crypto from 'crypto'
import tmpPromise from 'tmp-promise'
import data from './data.js'

export const getRollupPlugins = (name, options) => {
  const sharedOptions = {
    css: true,
    dev: !options.production,
    name,
    filename: name,
  }

  return {
    svelteSSR: sveltePlugin({
      generate: 'ssr',
      hydratable: false,
      ...sharedOptions,
    }),
    svelteDOM: sveltePlugin({
      generate: 'dom',
      hydratable: true,
      ...sharedOptions,
    }),
    nodeResolve: nodeResolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    terser: options.production && terser.terser(),
  }
}

export default async function bundle({ route }, options) {
  const bundleTimer = options.logging.start(
    chalk.yellow('Bundling'),
    route.relative
  )

  // Rollup seems to require all files to end in .js
  // Index.svelte.js
  const name = `${route.relative}.js`

  const componentName = name
    .split('.') // split on extension
    .find(a => true) // get before extension
    .split('/') // split file paths
    .reverse() // put file name before path
    .find(a => true) // grab the first found

  const [ssrRollup, domRollup, watchFiles] = await tmpPromise.withFile(
    async ({ path:temp_path }) => {
      // Save the file to disk temporarily so that
      // rollup can find for the 'entry' (input)
      writeFileSync(
        temp_path,
        `import ${componentName} from '${route.file}';export default ${componentName};typeof window !== 'undefined' && new ${componentName}({ target: document.body, hydrate: true, props: window.__SVELTE_PROPS__ });`
      )

      const plugins = getRollupPlugins(componentName, options)

      const [ssrRollup, domRollup] = await Promise.all([
        rollup.rollup({
          input: temp_path,
          plugins: [plugins.svelteSSR, plugins.nodeResolve, plugins.terser],
        }),
        rollup.rollup({
          input: temp_path,
          plugins: [plugins.svelteDOM, plugins.nodeResolve, plugins.terser],
        }),
      ])

      // watch all tracked dependencies
      // temp path and node_modules not invited
      const watchFiles = domRollup.watchFiles.filter(watched =>
        ['node_modules', temp_path].every(blacklist => !watched.includes(blacklist))
      )

      return [ssrRollup, domRollup, watchFiles]
    }
  )

  // generate the output bundles
  const [ssrModule, domModule, domNoModule] = await Promise.all([
    ssrRollup.generate({ format: 'esm' }), // ssr
    domRollup.generate({ format: 'esm' }), // module
    domRollup.generate({ format: 'iife', name: componentName }), // nomodule
  ])

  // generate fingerprints & save to disk
  const [SSRFingerprint, DOMFingerprint, IIFEFingerprint] = [
    // need to base64 encode it for the SSR here, so that when we need to
    // we can simply call import(code) at have it available
    `data:text/javascript;base64,${Buffer.from(
      ssrModule.output[0].code
    ).toString('base64')}`,
    domModule.output[0].code,
    domNoModule.output[0].code,
  ].map(code => write(name, code))

  const cacheData = {
    key: route.file,
    ssr: SSRFingerprint,
    dom: DOMFingerprint,
    iife: IIFEFingerprint,
    file: route.file,
    name,
    dependencies: watchFiles,
  }

  // Save to cache manifest
  data.set(cacheData)

  bundleTimer()

  return cacheData
}
