/**
 * @file Build step — minifies bundled CSS with lightningcss.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { transform } from 'lightningcss'
import { cssBundle, paths } from '../config.js'

/** Minifies dist/editor.css and writes source map. */
export function minifyCss() {
  const inputPath = join(paths.dist, cssBundle.name)
  const outputPath = join(paths.dist, cssBundle.minName)
  const mapPath = join(paths.dist, cssBundle.minMapName)

  const source = readFileSync(inputPath, 'utf8')

  const result = transform({
    filename: cssBundle.name,
    code: Buffer.from(source),
    minify: true,
    sourceMap: true,
  })

  const css = Buffer.from(result.code).toString('utf8')
  const withSourceMap = `${css}\n/*# sourceMappingURL=${cssBundle.minMapName} */\n`

  writeFileSync(outputPath, withSourceMap)
  writeFileSync(mapPath, result.map.toString())
}
