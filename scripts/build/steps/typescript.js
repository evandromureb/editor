/**
 * @file Build step — compiles TypeScript declarations via tsc.
 */

import { execSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { paths } from '../config.js'

/** Emits `.d.ts` files to `.build/types/`. */
export function compileTypes() {
  mkdirSync(paths.buildTypes, { recursive: true })
  rmSync(paths.buildTypes, { recursive: true, force: true })
  mkdirSync(paths.buildTypes, { recursive: true })

  execSync('npx tsc -p tsconfig.build.json', {
    stdio: 'inherit',
    cwd: paths.root,
  })
}
