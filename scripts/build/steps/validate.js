/**
 * @file Build step — validates required dist artifacts exist.
 */

import { join } from 'node:path'
import { requiredDistArtifacts, paths } from '../config.js'
import { assertFileExists } from '../utils.js'

/** @throws {Error} When any required dist artifact is missing or empty. */
export function validateDist() {
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
    throw new Error(`Validação da dist falhou:\n${missing.map((m) => `  - ${m}`).join('\n')}`)
  }

  console.log('  Todos os artefatos esperados foram gerados.')
}
