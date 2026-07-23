/** @typedef {'editor' | 'html' | 'view'} EditorMode */

/** @type {{ id: EditorMode, labelKey: string }[]} */
const MODE_ITEMS = [
  { id: 'editor', labelKey: 'ui.mode.editor' },
  { id: 'html', labelKey: 'ui.mode.html' },
  { id: 'view', labelKey: 'ui.mode.view' },
]

/**
 * @typedef {object} ModesOptions
 * @property {HTMLElement} root
 * @property {(mode: EditorMode) => void} onChange
 * @property {() => EditorMode} getMode
 * @property {(key: string) => string} [t]
 */

export class Modes {
  /** @type {(mode: EditorMode) => void} */
  #onChange

  /** @type {() => EditorMode} */
  #getMode

  /** @type {Map<EditorMode, HTMLButtonElement>} */
  #buttons = new Map()

  /** @param {ModesOptions} options */
  constructor(options) {
    this.#onChange = options.onChange
    this.#getMode = options.getMode
    const t = options.t ?? ((k) => k)

    const group = document.createElement('div')
    group.className = 'editor__modes'
    options.root.appendChild(group)

    for (const item of MODE_ITEMS) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'editor__mode-btn'
      button.textContent = t(item.labelKey)
      button.dataset.mode = item.id
      button.dataset.labelKey = item.labelKey
      button.addEventListener('click', () => this.#onChange(item.id))
      group.appendChild(button)
      this.#buttons.set(item.id, button)
    }

    this.refresh()
  }

  refresh() {
    const current = this.#getMode()

    for (const [mode, button] of this.#buttons) {
      button.classList.toggle('is-active', mode === current)
    }
  }

  /** @param {(key: string) => string} t */
  relocalize(t) {
    for (const button of this.#buttons.values()) {
      const key = button.dataset.labelKey
      if (key) button.textContent = t(key)
    }
  }
}
