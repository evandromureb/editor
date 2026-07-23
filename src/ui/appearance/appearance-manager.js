/** @typedef {'light' | 'dark'} Appearance */

export const APPEARANCES = /** @type {const} */ (['light', 'dark'])

export const STORAGE_KEY = 'editor-appearance'

const LEGACY_THEME_STORAGE_KEY = 'editor-theme'

/**
 * @param {string | null | undefined} value
 * @returns {Appearance}
 */
export function normalizeAppearance(value) {
  if (value === 'dark' || value === 'light') return value
  return 'light'
}

/**
 * @returns {Appearance | null}
 */
export function getSystemAppearance() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * @param {object} [options]
 * @param {boolean} [options.persist]
 * @returns {Appearance | null}
 */
export function resolveLegacyAppearance({ persist = true } = {}) {
  if (!persist || typeof localStorage === 'undefined') return null

  const storedAppearance = localStorage.getItem(STORAGE_KEY)
  if (storedAppearance) return null

  const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
  return legacyTheme === 'escuro' ? 'dark' : null
}

/**
 * @typedef {object} AppearanceManagerOptions
 * @property {HTMLElement} root
 * @property {Appearance} [initial]
 * @property {boolean} [persist=true]
 * @property {(appearance: Appearance) => void} [onChange]
 */

export class AppearanceManager {
  /** @type {HTMLElement} */
  #root

  /** @type {Appearance} */
  #appearance

  /** @type {boolean} */
  #persist

  /** @type {(appearance: Appearance) => void | undefined} */
  #onChange

  /** @type {Set<(appearance: Appearance) => void>} */
  #listeners = new Set()

  /** @param {AppearanceManagerOptions} options */
  constructor(options) {
    this.#root = options.root
    this.#persist = options.persist ?? true
    this.#onChange = options.onChange

    const stored = this.#persist ? localStorage.getItem(STORAGE_KEY) : null
    const legacy = resolveLegacyAppearance({ persist: this.#persist })
    const system = getSystemAppearance()

    this.#appearance = normalizeAppearance(options.initial ?? stored ?? legacy ?? system ?? 'light')
    this.apply()
  }

  /** @returns {Appearance} */
  getAppearance() {
    return this.#appearance
  }

  /** @param {Appearance} appearance */
  setAppearance(appearance) {
    const next = normalizeAppearance(appearance)
    if (next === this.#appearance) return

    this.#appearance = next
    this.apply()

    if (this.#persist) {
      localStorage.setItem(STORAGE_KEY, this.#appearance)
    }

    this.#notify()
  }

  /** @returns {Appearance} */
  toggleAppearance() {
    const next = this.#appearance === 'light' ? 'dark' : 'light'
    this.setAppearance(next)
    return this.#appearance
  }

  apply() {
    this.#root.dataset.appearance = this.#appearance
  }

  /**
   * @param {(appearance: Appearance) => void} listener
   * @returns {() => void}
   */
  subscribe(listener) {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  #notify() {
    this.#onChange?.(this.#appearance)

    for (const listener of this.#listeners) {
      listener(this.#appearance)
    }
  }
}
