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
import chalk from "chalk";
import svelteServer from "../server.js";
import { walkFilesSync } from "../src/utilities/utils.js";

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
const log = console.log;

if (args.init === true) {
  log("Specify the project name i.e. `npx svelte-server --init MyProject`");
  process.exit();
} else if (args.init) {
  /**
   * Project Creator
   */
  ["/", "pages", "layouts", "components", "public"].forEach((dir) => {
    if (!existsSync(join(resolve(), args.init, dir))) {
      mkdirSync(join(resolve(), args.init, dir));
    }
  });

  const __project_root = join(__dirname, "..");
  const files = walkFilesSync(join(__project_root, "template"));

  files.forEach((file) => {
    copyFileSync(file, join(resolve(), args.init, file));
  });
} else if (args.ssg) {
  /**
   * Static Site Generator
   */
  const setupFile = existsSync(join(resolve(), "setup.js"))
    ? import(join(resolve(), "setup.js")).then((a) => a.default)
    : Promise.resolve(null);

  setupFile.then((setup) => {
    svelteServer
      .config({
        ...setup,
        production: !args.dev,
      })
      .build();
  });
} else {
  /**
   * Live Server
   */
  const setupFile = existsSync(join(resolve(), "setup.js"))
    ? import(join(resolve(), "setup.js")).then((a) => a.default)
    : Promise.resolve(null);

  setupFile.then((setup) => {
    svelteServer
      .config({
        ...setup,

        // // cli arg overwrites

        // production mode
        production: setup?.config?.production ?? !args.dev,

        // hmr: args.hmr,
        hmr: setup?.config?.hmr ?? args.hmr,

        // public: args.public,

        // template: args.template
      })
      .listen(); // optional port # - finds first free port if not supplied
  });
}
