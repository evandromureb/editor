/** @typedef {import('./helpers.js').ThemeDefinition} ThemeDefinition */

import { theme } from './helpers.js'

/**
 * Defines a theme and validates its structure.
 *
 * @param {ThemeDefinition} definition
 * @returns {ThemeDefinition}
 */
export function defineTheme(definition) {
  return theme(definition)
}
