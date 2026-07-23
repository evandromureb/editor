/**
 * @file Ensures node_modules exists and dependencies are consistent before CI tasks.
 */

import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

if (!existsSync(join(root, 'node_modules'))) {
  console.log('[ensure-deps] node_modules missing — installing dependencies...')
  execSync('npm install', { stdio: 'inherit', cwd: root })
  process.exit(0)
}

try {
  execSync('npm ls --depth=0', { stdio: 'pipe', cwd: root })
} catch {
  console.log('[ensure-deps] Inconsistent dependencies — reinstalling...')
  execSync('npm install', { stdio: 'inherit', cwd: root })
}

console.log('[ensure-deps] Dependencies OK.')
