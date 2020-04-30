import { join, resolve } from 'path'
import { createRoute } from './utilities/utils.js'
import chokidar from 'chokidar'
import data from './shared/data.js'
import chalk from 'chalk'

export const setupWatcher = ({ options }) => {
  const watcher = chokidar.watch(options.watch.map(path => join(resolve(), path, '**/*.svelte')))

  watcher
    .on('unlink', path => {
      options.logging.log(
        chalk.red('File Removed'),
        path.replace(options.root, '')
      )

      // delete from routes
      const idx = options.routes.findIndex(file => file.file === path)
      if (idx >= 0) {
        options.routes.splice(idx, 1)
        // delete from cache
        data.delete({ key: path })
      }
    })
    .on('add', path => {
      options.logging.log(
        chalk.blue('File Added'),
        path.replace(options.root, '')
      )
      if (path.startsWith(options.root)) {
        options.routes.push(createRoute(options.root, path))
      }
    })
    .on('change', key => {
      options.logging.log(
        chalk.green('File Updated'),
        key.replace(options.root, '')
      )
      const parentOrChild = data.getDep({ key })
      if (parentOrChild) {
        data.delete({ key: parentOrChild.key })
      }
    })

    return watcher
}
