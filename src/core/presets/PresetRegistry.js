import { DEFAULT_LOCALE } from '../i18n/constants.js'

/** @typedef {import('../../editor.js').EditorOptions} EditorOptions */

/**
 * @typedef {object} EditorPreset
 * @property {string} [locale]
 * @property {number} [width]
 * @property {number} [height]
 * @property {string} [theme]
 * @property {boolean} [persistTheme]
 * @property {'light' | 'dark'} [appearance]
 * @property {boolean} [persistAppearance]
 * @property {string[]} [plugins]
 * @property {string[]} [toolbar]
 * @property {boolean} [responsive]
 * @property {boolean} [footer]
 */

/** @type {Map<string, EditorPreset>} */
const presets = new Map()

export const PresetRegistry = {
  /**
   * @param {string} name
   * @param {EditorPreset} config
   */
  register(name, config) {
    presets.set(name, { ...config })
  },

  /**
   * @param {string} name
   * @returns {EditorPreset | null}
   */
  get(name) {
    const preset = presets.get(name)
    return preset ? { ...preset } : null
  },

  /**
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return presets.has(name)
  },

  /**
   * @param {string} name
   * @returns {boolean}
   */
  remove(name) {
    return presets.delete(name)
  },
}

/** @type {EditorPreset} */
export const DEFAULT_PRESET = {
  locale: DEFAULT_LOCALE,
  theme: 'padrao',
  persistTheme: true,
  persistAppearance: true,
}
