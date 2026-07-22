/**
 * @file Build step — copies plugin asset directories into dist/.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from '../config.js'

const assetCategories = ['assets', 'icons', 'images', 'templates']

/** Copies plugin assets (assets, icons, images, templates) to dist/plugins/. */
export function copyPluginAssets() {
  const pluginsDir = join(paths.root, 'plugins')

  if (!existsSync(pluginsDir)) return

  for (const pluginId of readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)) {
    for (const category of assetCategories) {
      const srcDir = join(pluginsDir, pluginId, category)
      if (!existsSync(srcDir)) continue

      const destDir = join(paths.dist, 'plugins', pluginId, category)
      mkdirSync(destDir, { recursive: true })

      for (const file of readdirSync(srcDir, { withFileTypes: true })) {
        if (file.isFile()) {
          copyFileSync(join(srcDir, file.name), join(destDir, file.name))
        }
      }
    }
  }
}
