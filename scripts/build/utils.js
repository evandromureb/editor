/**
 * @file Build utilities — step runner and file existence assertions.
 */

import { existsSync, statSync } from 'node:fs'

/**
 * @param {string} step
 * @param {() => void | Promise<void>} fn
 */
export async function runStep(step, fn) {
  console.log(`\n[build] ${step}`)
  try {
    await fn()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\n[build] Failed at: ${step}`)
    console.error(message)
    process.exit(1)
  }
}

/**
 * @param {string} filePath
 */
export function assertFileExists(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Expected file not found: ${filePath}`)
  }
  if (statSync(filePath).size === 0) {
    throw new Error(`Empty file: ${filePath}`)
  }
}
