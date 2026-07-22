/**
 * @file Build step — copies compiled TypeScript declarations to dist/types/.
 */

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { paths } from '../config.js'

/** Copies `.build/types/` into `dist/types/`. */
export function copyTypes() {
  const dest = join(paths.dist, 'types')
  mkdirSync(dest, { recursive: true })

  if (!existsSync(paths.buildTypes)) {
    throw new Error(`Types directory not found: ${paths.buildTypes}`)
  }

  cpSync(paths.buildTypes, dest, { recursive: true })
}
