import { computeStats, computeHtmlStats } from './stats.js'
import { ZoomControl } from './zoom.js'
import { ThemeSelect } from '../themes/theme-select.js'
import { createToggleButton } from '../design-system/toggle-button.js'
import { createIcon } from '../design-system/icon.js'

/** @typedef {import('../../core/document/types.js').DocNode} DocNode */
/** @typedef {import('../../core/selection/types.js').EditorSelection} EditorSelection */
/** @typedef {import('../modes/modes.js').EditorMode} EditorMode */

/**
 * @typedef {object} StatusbarOptions
 * @property {HTMLElement} root
 * @property {HTMLElement} leftSlot
 * @property {HTMLElement} centerSlot
 * @property {HTMLElement} rightSlot
 * @property {HTMLElement} zoomTarget
 * @property {HTMLElement} [portalRoot]
 * @property {() => DocNode} getDocument
 * @property {() => EditorSelection} getSelection
 * @property {() => EditorMode} getMode
 * @property {() => string} getHtmlSource
 * @property {() => string | null} [getHtmlError]
 * @property {() => string} getTheme
 * @property {(themeId: string) => void} onThemeChange
 * @property {(key: string) => string} [t]
 * @property {import('../appearance/appearance-manager.js').AppearanceManager} [appearanceManager]
 */

export class Statusbar {
  /** @type {HTMLElement} */
  #statsEl

  /** @type {HTMLElement} */
  #errorEl

  /** @type {HTMLElement} */
  #right

  /** @type {HTMLElement} */
  #left

  /** @type {HTMLElement} */
  #center

  /** @type {ThemeSelect} */
  #themeSelect

  /** @type {() => DocNode} */
  #getDocument

  /** @type {() => EditorSelection} */
  #getSelection

  /** @type {() => EditorMode} */
  #getMode

  /** @type {() => string} */
  #getHtmlSource

  /** @type {() => string | null} */
  #getHtmlError

  /** @type {(key: string) => string} */
  #t

  /** @type {import('../appearance/appearance-manager.js').AppearanceManager | undefined} */
  #appearanceManager

  /** @type {HTMLButtonElement | null} */
  #appearanceToggle = null

  /** @type {ZoomControl} */
  #zoomControl

  /** @param {StatusbarOptions} options */
  constructor(options) {
    this.#getDocument = options.getDocument
    this.#getSelection = options.getSelection
    this.#getMode = options.getMode
    this.#getHtmlSource = options.getHtmlSource
    this.#getHtmlError = options.getHtmlError ?? (() => null)
    this.#t = options.t ?? ((k) => k)
    this.#appearanceManager = options.appearanceManager

    this.#left = options.leftSlot
    this.#center = options.centerSlot
    this.#right = options.rightSlot

    this.#themeSelect = new ThemeSelect({
      root: this.#left,
      portalRoot: options.portalRoot,
      getTheme: options.getTheme,
      onChange: options.onThemeChange,
      t: this.#t,
    })

    // Add appearance toggle after theme select
    if (this.#appearanceManager) {
      this.#createAppearanceToggle()
    }

    this.#statsEl = document.createElement('div')
    this.#statsEl.className = 'editor__stats'

    this.#errorEl = document.createElement('div')
    this.#errorEl.className = 'editor__statusbar-error'
    this.#errorEl.hidden = true

    this.#center.append(this.#statsEl, this.#errorEl)

    this.#zoomControl = new ZoomControl({
      root: this.#right,
      target: options.zoomTarget,
      t: this.#t,
    })

    this.refresh()
  }

  /**
   * Create and insert appearance toggle into left slot
   */
  #createAppearanceToggle() {
    if (!this.#appearanceManager) return

    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 1.5a5 5 0 0 1 0 10V3z"/></svg>`

    const toggle = createToggleButton({
      title: this.#t('ui.appearance.toggle'),
      className: 'editor__toolbar-btn editor__toolbar-btn--appearance-toggle',
      active: this.#appearanceManager.getAppearance() === 'dark',
      onClick: () => {
        this.#appearanceManager.toggleAppearance()
        updateIcon()
      },
    })
    toggle.setAttribute('aria-label', this.#t('ui.appearance.toggle'))
    toggle.appendChild(createIcon(sunIcon, { name: 'sun' }))
    toggle.appendChild(createIcon(moonIcon, { name: 'moon' }))

    const updateIcon = () => {
      const isDark = this.#appearanceManager.getAppearance() === 'dark'
      toggle.classList.toggle('is-active', isDark)
    }

    // Subscribe to appearance changes
    if (typeof this.#appearanceManager.subscribe === 'function') {
      this.#appearanceManager.subscribe(() => updateIcon())
    }

    updateIcon()
    this.#left.appendChild(toggle)
    this.#appearanceToggle = toggle
  }

  /** @returns {HTMLElement} */
  getLeftElement() {
    return this.#left
  }

  /** @returns {HTMLElement} */
  getCenterElement() {
    return this.#center
  }

  /** @returns {HTMLElement} */
  getRightElement() {
    return this.#right
  }

  /** @param {(key: string) => string} t */
  relocalize(t) {
    this.#t = t
    this.#themeSelect.relocalize(t)
    this.#zoomControl.relocalize(t)
    if (this.#appearanceToggle) {
      this.#appearanceToggle.title = t('ui.appearance.toggle')
      this.#appearanceToggle.setAttribute('aria-label', t('ui.appearance.toggle'))
    }
  }

  /** @param {{ block: string, words: number, chars: number }} stats */
  #formatStats(stats) {
    const t = this.#t
    const sep = ` ${t('ui.stats.separator')} `
    return `${stats.block}${sep}${stats.words} ${t('ui.stats.words')}${sep}${stats.chars} ${t('ui.stats.chars')}`
  }

  refresh() {
    if (!this.#themeSelect.isOpen) {
      this.#themeSelect.sync()
    }

    const htmlError = this.#getHtmlError()
    if (htmlError) {
      const key = htmlError === 'disallowed' ? 'ui.html.disallowed' : 'ui.html.invalid'
      this.#errorEl.textContent = this.#t(key)
      this.#errorEl.hidden = false
    } else {
      this.#errorEl.hidden = true
      this.#errorEl.textContent = ''
    }

    const paragraphLabel = this.#t('ui.stats.paragraph')

    if (this.#getMode() === 'html') {
      this.#statsEl.textContent = this.#formatStats(
        computeHtmlStats(this.#getHtmlSource(), paragraphLabel),
      )
      return
    }

    const stats = computeStats(this.#getDocument(), this.#getSelection(), paragraphLabel)
    this.#statsEl.textContent = this.#formatStats(stats)
  }
}
