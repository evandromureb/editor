import { normalizeThemeId } from './registry.js'

const STORAGE_KEY = 'editor-theme'

/**
 * @typedef {object} ThemeManagerOptions
 * @property {HTMLElement} root
 * @property {string} [initial]
 * @property {boolean} [persist=true]
 */

export class ThemeManager {
  /** @type {HTMLElement} */
  #root

  /** @type {string} */
  #theme

  /** @type {boolean} */
  #persist

  /** @param {ThemeManagerOptions} options */
  constructor(options) {
    this.#root = options.root
    this.#persist = options.persist ?? true

    const stored = this.#persist ? localStorage.getItem(STORAGE_KEY) : null
    this.#theme = normalizeThemeId(options.initial ?? stored ?? 'padrao')
    this.apply()
  }

  /** @returns {string} */
  getTheme() {
    return this.#theme
  }

  /** @param {string} themeId */
  setTheme(themeId) {
    this.#theme = normalizeThemeId(themeId)
    this.apply()

    if (this.#persist) {
      localStorage.setItem(STORAGE_KEY, this.#theme)
    }
  }

  apply() {
    this.#root.dataset.theme = this.#theme
  }
}
