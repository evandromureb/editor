import { THEMES } from './registry.js'
import { Select } from '../select/index.js'

/**
 * @typedef {object} ThemeSelectOptions
 * @property {HTMLElement} root
 * @property {HTMLElement} [portalRoot]
 * @property {() => string} getTheme
 * @property {(themeId: string) => void} onChange
 * @property {(key: string) => string} [t]
 */

export class ThemeSelect {
  /** @type {Select} */
  #select

  /** @type {() => string} */
  #getTheme

  /** @param {ThemeSelectOptions} options */
  constructor(options) {
    this.#getTheme = options.getTheme

    const wrapper = document.createElement('div')
    wrapper.className = 'editor__theme'

    this.#select = new Select({
      id: 'editor-theme',
      name: 'theme',
      className: 'editor__theme-select',
      placement: 'top',
      portalRoot: options.portalRoot,
      options: THEMES.map((theme) => ({
        value: theme.id,
        label: theme.label,
      })),
      value: this.#getTheme(),
      onChange: (themeId) => options.onChange(themeId),
      t: options.t,
    })

    wrapper.appendChild(this.#select.element)
    options.root.appendChild(wrapper)
    const t = options.t ?? ((k) => k)
    this.#applyThemeLabel(t)
    this.relocalize(t)
  }

  /** @param {(key: string) => string} t */
  #applyThemeLabel(t) {
    this.#select.element
      .querySelector('.bl-select__trigger')
      ?.setAttribute('aria-label', t('ui.theme.label'))
  }

  sync() {
    if (this.#select.open) return
    this.#select.setValue(this.#getTheme())
  }

  /** @returns {boolean} */
  get isOpen() {
    return this.#select.open
  }

  /** @param {(key: string) => string} t */
  relocalize(t) {
    this.#applyThemeLabel(t)
    this.#select.setOptions(
      THEMES.map((theme) => {
        const key = `theme.${theme.id}`
        const translated = t(key)
        return {
          value: theme.id,
          label: translated !== key ? translated : theme.label,
        }
      })
    )
    this.sync()
  }
}
