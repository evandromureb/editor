/**
 * @file Validates that all required dist artifacts exist after build.
 */

import { join } from 'node:path'
import { requiredDistArtifacts, paths } from './build/config.js'
import { assertFileExists } from './build/utils.js'

const missing = []

for (const artifact of requiredDistArtifacts) {
  const filePath = join(paths.dist, artifact)
  try {
    assertFileExists(filePath)
  } catch (error) {
    missing.push(error instanceof Error ? error.message : String(error))
  }
}

if (missing.length > 0) {
  console.error('[validate:dist] Validation failed:')
  for (const message of missing) {
    console.error(`  - ${message}`)
  }
  process.exit(1)
}

console.log('[validate:dist] OK — all expected artifacts are present.')
