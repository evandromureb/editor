/**
 * @typedef {object} ZoomControlOptions
 * @property {HTMLElement} root
 * @property {HTMLElement} target
 * @property {(key: string) => string} [t]
 * @property {(zoom: number) => void} [onChange]
 */

export class ZoomControl {
  /** @type {HTMLElement} */
  #root

  /** @type {HTMLElement} */
  #target

  /** @type {(zoom: number) => void} */
  #onChange

  /** @type {(key: string) => string} */
  #t

  /** @type {HTMLElement} */
  #valueEl

  /** @type {number} */
  #zoom = 100

  /** @type {HTMLButtonElement} */
  #minusEl

  /** @type {HTMLButtonElement} */
  #plusEl

  /** @param {ZoomControlOptions} options */
  constructor(options) {
    this.#root = options.root
    this.#target = options.target
    this.#onChange = options.onChange ?? (() => {})
    this.#t = options.t ?? ((k) => k)

    const group = document.createElement('div')
    group.className = 'editor__zoom'

    const minus = document.createElement('button')
    minus.type = 'button'
    minus.className = 'editor__zoom-btn'
    minus.textContent = '−'
    minus.setAttribute('aria-label', this.#t('ui.zoom.decrease'))
    minus.addEventListener('click', () => this.#step(-10))
    this.#minusEl = minus

    this.#valueEl = document.createElement('span')
    this.#valueEl.className = 'editor__zoom-value'
    this.#valueEl.textContent = '100%'

    const plus = document.createElement('button')
    plus.type = 'button'
    plus.className = 'editor__zoom-btn'
    plus.textContent = '+'
    plus.setAttribute('aria-label', this.#t('ui.zoom.increase'))
    plus.addEventListener('click', () => this.#step(10))
    this.#plusEl = plus

    group.append(minus, this.#valueEl, plus)
    this.#root.appendChild(group)
    this.apply()
  }

  /** @param {(key: string) => string} t */
  relocalize(t) {
    this.#t = t
    this.#minusEl.setAttribute('aria-label', this.#t('ui.zoom.decrease'))
    this.#plusEl.setAttribute('aria-label', this.#t('ui.zoom.increase'))
  }

  /** @returns {number} */
  getValue() {
    return this.#zoom
  }

  apply() {
    this.#target.style.setProperty('--editor-zoom', String(this.#zoom / 100))
    this.#valueEl.textContent = `${this.#zoom}%`
    this.#onChange(this.#zoom)
  }

  /** @param {number} delta */
  #step(delta) {
    this.#zoom = Math.max(50, Math.min(200, this.#zoom + delta))
    this.apply()
  }
}
