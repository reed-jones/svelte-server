#!/usr/bin/env node
import minimist from 'minimist'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

import svelteServer from '../server.js'

const args = minimist(process.argv.slice(2))

/**
 * User Configuration. All options are optional and
 * have reasonable defaults
 *
 * setup.props              per page data loading
 * setup.config.hmr         enable hot reloading
 * setup.config.logging     show console logging
 * setup.config.path        base svelte files folder
 * setup.config.port        port to serve application on
 * setup.config.public      public static assets folder
 * setup.config.template    template file
 */

const setupFile = existsSync(join(resolve(), 'setup.js'))
  ? import(join(resolve(), 'setup.js')).then(a => a.default)
  : Promise.resolve(null)

setupFile.then(setup => {
    svelteServer.config({
        ...setup,

        // // cli arg overwrites

        //
        production: !args.dev,

        // hmr: args.hmr,

        // public: args.public,

        // template: args.template
  }).listen() // optional port # - finds first free port if not supplied
})
