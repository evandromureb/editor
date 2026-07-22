import { DEFAULT_LOCALE } from './constants.js'

/**
 * Core internationalization API.
 * The core provides only the mechanism; each plugin registers its own dictionary.
 */
export class I18n {
  /** @type {Map<string, Record<string, string>>} */
  #dicts = new Map()

  /** @type {string} */
  #locale

  /** @param {{ locale?: string }} [options] */
  constructor(options = {}) {
    this.#locale = options.locale ?? DEFAULT_LOCALE
  }

  /**
   * @param {string} locale
   * @param {Record<string, string>} dict
   */
  register(locale, dict) {
    const existing = this.#dicts.get(locale) ?? {}
    this.#dicts.set(locale, { ...existing, ...dict })
  }

  /**
   * @param {string} key
   * @param {string} [locale]
   * @returns {string}
   */
  t(key, locale) {
    const lang = locale ?? this.#locale

    const primary = this.#dicts.get(lang)
    if (primary?.[key] !== undefined) return primary[key]

    if (lang !== 'en') {
      const fallback = this.#dicts.get('en')
      if (fallback?.[key] !== undefined) return fallback[key]
    }

    return key
  }

  /**
   * @param {string} locale
   * @param {string[]} keys
   */
  unregister(locale, keys) {
    const dict = this.#dicts.get(locale)
    if (!dict) return
    for (const key of keys) {
      delete dict[key]
    }
  }

  /** @param {string} locale */
  setLocale(locale) {
    this.#locale = locale
  }

  /** @returns {string} */
  getLocale() {
    return this.#locale
  }
}
