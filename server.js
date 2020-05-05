import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import http from "http";
import Koa from "koa";
import { dirname, join, resolve } from "path";
import {
  applyBundledJSMiddleware,
  applyPublicMiddleware,
  applyRouteContextMiddleware,
  applySSRMiddleware,
  applyWebsocketMiddleware,
  start,
} from "./src/middleware/applyMiddlewareToApp.js";
import { put, get } from "./src/shared/filesystem.js";
import { logging, createRoute, renderTemplate } from "./src/utilities/utils.js";
import { setupWatcher } from "./src/watcher.js";
import bundle from './src/shared/bundle.js'

/**
 * TODO: Major Refactoring
 *
 * - make DOM/IIFE bundles optional
 * - incremental build improvements
 * - fingerprint contents pre-compilation?
 * - persistent memfs
 *
 * process.on('SIGINT', () => {
 *   // write memfs to disk somewhere so we can resume previous builds
 *   console.log("Caught interrupt signal");
 *   process.exit();
 * })
 *
 * with static site generation
 *  - fingerprint each file & only rebuild if needed (non-existent)
 *  - clean unused/old files no longer needed
 */

const __dirname = dirname(new URL(import.meta.url).pathname);

const walkSync = (dir, fileList = null) => {
  const files = readdirSync(dir);
  fileList = fileList ?? [];
  files.forEach((file) => {
    if (statSync(join(dir, file)).isDirectory()) {
      fileList = walkSync(join(dir, file, "/"), fileList);
    } else {
      fileList.push(join(dir, file));
    }
  });
  return fileList;
};

const generateStaticSite = async (routes, options) => {
  const bundlePromises = routes.map(async (route) => {
    const propCallback =
      options.props?.[route.url] ?? Promise.resolve.bind(Promise);
    return {
      route,
      props: await propCallback({}), // no way to pass in url params with a static site
      bundle: await bundle({ route }, options),
    };
  });

  const bundles = await Promise.all(bundlePromises)

  return await Promise.all(bundles.map(async ({ route, props, bundle }) => ({
    route,
    props,
    bundle,
    template: await renderTemplate(bundle, props, options)
  })));
};

const svelteServer = {
  setup: {
    /* gets filled with config() */
  },

  /**
   * Sets the configuration object for the svelte server.
   * Uses default settings if not called
   *
   * @param {object} setup optional user configuration file
   *
   * @return {this} returns the configured server... just call .listen()
   */
  config(setup = null) {
    const inDev = !(setup?.config?.production ?? setup?.production ?? true);
    const inProduction = !inDev;
    const hmrEnabled = process.env.HMR_ENABLED === "true";
    const publicFolder = join(
      resolve(),
      setup?.config?.public ?? setup?.public ?? "public"
    );
    const _templateName =
      setup?.config?.template ?? setup?.template ?? "index.template.ejs";
    const _userTemplate = join(resolve(), _templateName);
    const templateFile = existsSync(_userTemplate)
      ? _userTemplate
      : join(resolve(), "node_modules", "svelte-server", "index.template.ejs");
    const defaultAliases = {
      "@components": "./components",
      "@layouts": "./layouts",
      "@pages": "./pages",
    };

    const mapAliases = (aliases) => {
      return Object.fromEntries(
        Object.entries(aliases).map(([alias, path]) => {
          if (existsSync(join(resolve(), path))) {
            return [alias, join(resolve(), path)];
          }
        })
      );
    };

    Object.assign(this.setup, {
      // User supplied props functions
      props: setup?.props ?? null,

      // hot module reloading
      hmr: hmrEnabled || setup?.config?.hmr || setup?.hmr,

      // show logging (defaults on in dev, off in prod)
      logging: logging(
        !inProduction || setup?.config?.logging || setup?.logging
      ),

      // base path where all the svelte files are kept
      root: join(resolve(), setup?.config?.pages ?? setup?.pages ?? "./pages"),

      // Port to listen on
      port: setup?.config?.port ?? setup?.port ?? null,

      // path to public folder... will be served statically
      public: existsSync(publicFolder) ? publicFolder : null,

      // html template file
      template: templateFile,

      svelteOptions: setup?.config?.svelteOptions ?? setup?.svelteOptions ?? {},

      // chokidar watch locations (just looks for .svelte files) defaults to the main pages directory
      watch: setup?.config?.watch ??
        setup?.watch ?? [setup?.config?.path ?? setup?.path ?? "./pages"],

      // import aliases (not yet enabled)
      alias: mapAliases(setup?.config?.alias ?? setup?.alias ?? defaultAliases),

      // in prod, minify etc. NODE_ENV
      production: inProduction,

      // All found routes (will be updated via chokidar)
      routes: [],
    });

    return this;
  },

  build() {
    if (!Object.keys(this.setup).length) {
      this.config(); // Initialize all default settings
    }

    // list all the files
    const routes = walkSync(this.setup.root)
      .map((file) => createRoute(this.setup.root, file))
      .filter((route) => route.params.length === 0); // parameters not available during static site generation (for now?)

    generateStaticSite(routes, this.setup)
      .then(files => {
        const htmlBase = join(resolve(), 'html')
        if (!existsSync(htmlBase)) {
          mkdirSync(htmlBase);
        }

        const jsBase = join(htmlBase, '_js')
        if (!existsSync(jsBase)) {
          mkdirSync(jsBase);
        }

        files.forEach(file => {
          if (!existsSync(join(htmlBase, file.route.url))) {
            mkdirSync(join(htmlBase, file.route.url), { recursive: true });
          }

          writeFileSync(join(jsBase, file.bundle.dom), get(file.bundle.dom))
          writeFileSync(join(jsBase, file.bundle.iife), get(file.bundle.iife))
          writeFileSync(join(htmlBase, file.route.url, 'index.html'), file.template)
        })
      })

    // TODO: Copy contents of public folder over
    // maybe something like: https://gist.github.com/rraallvv/7502a566cd358b347c0c81571c526770
  },

  /**
   * Starts serving the svelte files
   *
   * @param {number?} port
   */
  listen(port = this.setup?.port ?? null) {
    if (!Object.keys(this.setup).length) {
      this.config(); // Initialize all default settings
    }

    if (this.setup.hmr) {
      const contents = readFileSync(join(__dirname, "client.js"));
      put("hmr-client.js", contents);
    }

    /**
     * Base 'pages' path is the only required file.
     * Can be renamed, but needs to exist in some form
     */
    if (!existsSync(this.setup.root)) {
      mkdirSync(this.setup.root);
    }

    // listen() port overrides all
    const options = this.setup;
    options.port = port;

    const app = new Koa();

    app.env = this.setup.production ? "production" : "development";

    const server = http.createServer(app.callback());
    const watcher = setupWatcher({ options });

    [
      applyRouteContextMiddleware,
      applyPublicMiddleware,
      applySSRMiddleware,
      applyBundledJSMiddleware,
      applyWebsocketMiddleware,
      start,
    ].reduce((serverOptions, m) => (m(serverOptions), serverOptions), {
      app,
      options,
      server,
      watcher,
    });
  },
};

export default svelteServer;
