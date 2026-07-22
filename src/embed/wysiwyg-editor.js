import { Editor } from '../editor.js'
import { discoveredPlugins } from '../generated/plugins.registry.js'
import { DEFAULT_LOCALE } from '../core/i18n/constants.js'

/** @typedef {import('../editor.js').Editor} EditorInstance */
/** @typedef {import('../sdk/types.js').PluginDefinition} PluginDefinition */

export class WysiwygEditorElement extends HTMLElement {
  static observedAttributes = ['theme', 'appearance', 'locale', 'for']

  /** @type {EditorInstance | null} */
  #editor = null

  /** @type {PluginDefinition[]} */
  #plugins = discoveredPlugins

  connectedCallback() {
    this.#mount()
  }

  disconnectedCallback() {
    this.#editor?.destroy()
    this.#editor = null
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return

    if (name === 'theme' && this.#editor) {
      this.#editor.setTheme(newValue ?? 'padrao')
    }

    if (name === 'appearance' && this.#editor) {
      this.#editor.setAppearance(newValue === 'dark' ? 'dark' : 'light')
    }

    if (name === 'locale' && this.#editor) {
      this.#editor.setLocale(newValue ?? DEFAULT_LOCALE)
    }

    if (name === 'for') {
      this.#editor?.destroy()
      this.#editor = null
      this.#mount()
    }
  }

  /** @returns {EditorInstance | null} */
  get editor() {
    return this.#editor
  }

  /** @param {PluginDefinition[]} plugins */
  set plugins(plugins) {
    this.#plugins = plugins
  }

  /** @returns {PluginDefinition[]} */
  get plugins() {
    return this.#plugins
  }

  #mount() {
    if (this.#editor) return

    const textarea = this.#resolveTextarea()
    textarea.classList.add('editor-source')

    const theme = this.getAttribute('theme') ?? undefined
    const appearanceAttr = this.getAttribute('appearance')
    const appearance =
      appearanceAttr === 'dark' || appearanceAttr === 'light' ? appearanceAttr : undefined
    const locale = this.getAttribute('locale') ?? undefined

    this.#editor = new Editor({
      textarea,
      root: this,
      plugins: this.#plugins,
      theme,
      appearance,
      locale,
    })
  }

  /** @returns {HTMLTextAreaElement} */
  #resolveTextarea() {
    const forId = this.getAttribute('for')

    if (!forId) {
      throw new Error('wysiwyg-editor: "for" attribute is required')
    }

    const textarea = document.getElementById(forId)

    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error(`wysiwyg-editor: textarea #${forId} not found`)
    }

    return textarea
  }
}

/**
 * @param {string} [tagName]
 */
export function defineEditor(tagName = 'wysiwyg-editor') {
  if (customElements.get(tagName)) return
  customElements.define(tagName, WysiwygEditorElement)
}
