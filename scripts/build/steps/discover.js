/**
 * @file Build step — runs plugin/theme discovery.
 */

import { execSync } from 'node:child_process'
import { paths } from '../config.js'

/** Runs `scripts/discover.js` from the project root. */
export function runDiscover() {
  execSync('node scripts/discover.js', { stdio: 'inherit', cwd: paths.root })
}
