module.exports = {
  // Data Loading. root page props can be supplied here.
  // using the url as the key, make a function that
  // returns an object containing all the required props
  props: {
    "/": () => ({
      // name: "World",
    }),

    // wildcard routes will get converted to parameters
    // and passed into here for use with data-fetching
    // from an external api, or whatever...
    // Dynamic routes are created by making a folder
    // named by placing [ ] around the key, the following
    // example would be found in  /pages/posts/[post]/Index.svelte
    "/posts/:post": async ({ post }) => {
      // do stuff with (or without) 'post' from the url
      return {
        // slug: post,
      };
    },
  },

  // settings for svelte-server. Most options have a CLI flag which can be used if preferred
  config: {
    // path to static public assets
    public: "./public",

    // pages for filesystem based routing
    pages: "./pages",

    // chokidar watch locations (just looks for svelte files)
    watch: ["./pages", "./components", "./layouts"],

    // main page template: https://ejs.co/
    template: "index.template.ejs",

    // import aliases
    alias: {
      "@components": "./components",
      "@layouts": "./layouts",
      "@pages": "./pages",
    },
  },
};
