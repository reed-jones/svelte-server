import * as rollup from 'rollup'
import write from './cache-write.js'
import terser from 'rollup-plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import sveltePlugin from 'rollup-plugin-svelte'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import chalk from 'chalk'
import crypto from 'crypto'
import tmpPromise from 'tmp-promise'


const generateFingerprint = (name, source) => {
  let hash = crypto.createHash('sha1')
  hash.update(Buffer.from(source))
  let sha = hash.digest('hex').substr(0, 16)
  let [filename, extension] = name
    .split('/')
    .slice(0)
    .reverse()
    .shift()
    .split('.')

  return `${filename}-${sha}.js`
}

export default async function bundle({ route }, options) {
  const stopTimer = options.logging.start(
    chalk.yellow('Bundling'),
    route.relative
  )

  const name = `${route.relative}.js` // Index.svelte.js

  const componentName = name
    .split('.') // split on extension
    .find(a => true) // get before extension
    .split('/') // split file paths
    .reverse() // put file name before path
    .find(a => true) // grab the first found

  if (!existsSync(options.public)) {
    mkdirSync(options.public)
  }

  const relative = route.file.replace(
      options.root,
      options.root.replace(resolve(), '')
  )

  const entrySource = `import ${componentName} from '${route.file}';export default ${componentName};typeof window !== 'undefined' && new ${componentName}({ target: document.body, hydrate: true, props: window.__SVELTE_PROPS__ });`
  // const { path, cleanup } = await tmpPromise.file();
  // writeFileSync(path, entrySource)


  const SSROptions = {
    generate: 'ssr',
    css: true,
    dev: !options.production,
    hydratable: false,
    name: componentName,
    filename: componentName,
  }

  const DOMOptions = {
    generate: 'dom',
    css: true,
    dev: !options.production,
    hydratable: true,
    name: componentName,
    filename: componentName,
  }
  const [ssrRollup, domRollup] = await tmpPromise.withFile(async ({ path }) => {
    // Save the file to disk temporarily so that
    // rollup can find for the 'entry'(input)
    writeFileSync(path, entrySource)

    return Promise.all([
      rollup.rollup({
        input: path,
        plugins: [
          sveltePlugin(SSROptions),
          nodeResolve({ browser: true, dedupe: ['svelte'] }),
          options.production && terser.terser(),
        ],
      }),
      rollup.rollup({
        input: path,
        plugins: [
          sveltePlugin(DOMOptions),
          nodeResolve({ browser: true, dedupe: ['svelte'] }),
          options.production && terser.terser(),
        ],
      }),
    ])
  })

  // watch all tracked dependencies
  const watchFiles = domRollup.watchFiles.filter(a => !a.includes('node_modules'))

  // generate the output bundles
  const [ssrModule, domModule, domNoModule] = await Promise.all([
    ssrRollup.generate({ format: 'esm' }), // ssr
    domRollup.generate({ format: 'esm' }), // module
    domRollup.generate({ format: 'iife', name: componentName }), // nomodule
  ])

  stopTimer()

  return write(
    {
      file: route.file,
      ssr: ssrModule.output[0].code,
      dom: domModule.output[0].code,
      iife: domNoModule.output[0].code,
      name,
      dependencies: watchFiles,
    },
    { options }
  )
}
