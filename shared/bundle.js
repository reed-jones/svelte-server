import * as rollup from 'rollup'
import write from './cache-write.js'
import terser from 'rollup-plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import sveltePlugin from 'rollup-plugin-svelte'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import chalk from 'chalk'

export default async function bundle({ route }, options) {
  const stopTimer = options.logging.start(
    `[${chalk.yellow('Bundling')}]: ${route.relative}`
  )

  const name = `${route.relative}.js` // Index.svelte.js
  // const raw = readFileSync(route.file).toString()
  const componentName = name
    .split('.') // split on extension
    .find(a => true) // get before extension
    .split('/') // split file paths
    .reverse() // put file name before path
    .find(a => true) // grab the first found

  if (!existsSync(options.output)) {
    mkdirSync(options.output)
  }

  writeFileSync(
    join(options.output, `component.js`),
    `import ${componentName} from '..${route.file.replace(
      options.root,
      options.root.replace(resolve(), '')
    )}';
export default ${componentName};
typeof window !== 'undefined' && new ${componentName}({ target: document.body, hydrate: true });
`
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
      input: join(options.output, 'component.js'),
      plugins: [
        sveltePlugin(SSROptions),
        nodeResolve({
          browser: true,
          dedupe: ['svelte'],
        }),
        options.production && terser.terser(),
      ],
    }),
    rollup.rollup({
      input: join(options.output, 'component.js'),
      plugins: [
        sveltePlugin(DOMOptions),
        nodeResolve({
          browser: true,
          dedupe: ['svelte'],
        }),
        options.production && terser.terser(),
      ],
    }),
  ])

  unlinkSync(join(options.output, `component.js`))

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
    },
    options
  )
}
