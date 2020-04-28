import * as rollup from 'rollup'
import write from './cache-write.js'
import terser from 'rollup-plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import sveltePlugin from 'rollup-plugin-svelte'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import chalk from 'chalk'
import crypto from 'crypto'

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
    `[${chalk.yellow('Bundling')}]: ${route.relative}`
  )

  const name = `${route.relative}.js` // Index.svelte.js

  const componentName = name
    .split('.') // split on extension
    .find(a => true) // get before extension
    .split('/') // split file paths
    .reverse() // put file name before path
    .find(a => true) // grab the first found

  if (!existsSync(options.output)) {
    mkdirSync(options.output)
  }

  const props = await options.userConfig?.props?.[route.url]?.(route.params ?? {}) ?? await Promise.resolve({})

  const entrySource = `import ${componentName} from '..${route.file.replace(
    options.root,
    options.root.replace(resolve(), '')
  )}';
export default ${componentName};
typeof window !== 'undefined' && new ${componentName}({ target: document.body, hydrate: true, props: ${JSON.stringify(props)} });
`

  const generatedFileName = generateFingerprint(componentName, entrySource)

  writeFileSync(
    join(options.output, generatedFileName),
    entrySource
  )

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
    css: !!options.hmr,
    dev: !options.production,
    hydratable: true,
    name: componentName,
    filename: componentName,
  }

  const [ssrRollup, domRollup] = await Promise.all([
    rollup.rollup({
      input: join(options.output, generatedFileName),
      plugins: [
        sveltePlugin(SSROptions),
        nodeResolve({ browser: true, dedupe: ['svelte'] }),
        options.production && terser.terser(),
      ],
    }),
    rollup.rollup({
      input: join(options.output, generatedFileName),
      plugins: [
        sveltePlugin(DOMOptions),
        nodeResolve({ browser: true, dedupe: ['svelte'] }),
        options.production && terser.terser(),
      ],
    }),
  ])

  const watchFiles = domRollup.watchFiles.filter(a => !a.includes(`.generated`) && !a.includes('node_modules'))

  // TODO: Only in housekeeping mode
  unlinkSync(join(options.output, generatedFileName))

  const [ssrModule, domModule, domNoModule] = await Promise.all([
    ssrRollup.generate({ format: 'esm' }),
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
      dependencies: watchFiles
    },
    { options, route, props }
  )
}
