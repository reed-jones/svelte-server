#!/usr/bin/env node
import minimist from "minimist";
import { join, resolve, basename, dirname } from "path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  lstatSync,
} from "fs";

import svelteServer from "../server.js";

const __dirname = dirname(new URL(import.meta.url).pathname);
const args = minimist(process.argv.slice(2));

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

function copyFileSync(source, target) {
  //if target is a directory a new file with the same name will be created
  const targetFile =
    existsSync(target) && lstatSync(target).isDirectory()
      ? join(target, basename(source))
      : target;

  writeFileSync(targetFile, readFileSync(source));
}

if (args.init) {
  if (args.init === true) {
    console.log(
      "Specify the project name i.e. `npx svelte-server --init MyProject`"
    );
  } else {
    ["/", "pages", "layouts", "components", "public"].forEach((dir) => {
      if (!existsSync(join(resolve(), args.init, dir))) {
        mkdirSync(join(resolve(), args.init, dir));
      }
    });

    [
      "setup.js",
      "README.md",
      "index.template.ejs",
      "public/favicon-16x16.png",
      "pages/Index.svelte",
    ].forEach((file) => {
      copyFileSync(
        join(__dirname, '..', 'template', file),
        join(resolve(), args.init, file)
      );
    });
  }
} else {
  const setupFile = existsSync(join(resolve(), "setup.js"))
    ? import(join(resolve(), "setup.js")).then((a) => a.default)
    : Promise.resolve(null);

  setupFile.then((setup) => {
    svelteServer
      .config({
        ...setup,

        // // cli arg overwrites

        //
        production: !args.dev,

        // hmr: args.hmr,

        // public: args.public,

        // template: args.template
      })
      .listen(); // optional port # - finds first free port if not supplied
  });
}
