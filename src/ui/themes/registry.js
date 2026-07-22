import { discoveredThemes } from '../../generated/themes.registry.js'

/**
 * @typedef {import('../../sdk/define-theme.js').ThemeDefinition} ThemeDefinition
 */

/** @type {ThemeDefinition[]} */
export const THEMES = discoveredThemes

/**
 * @param {string} id
 * @returns {ThemeDefinition | null}
 */
export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) ?? null
}

/**
 * @param {string} id
 * @returns {string}
 */
export function normalizeThemeId(id) {
  return getTheme(id) ? id : (THEMES[0]?.id ?? 'padrao')
}
