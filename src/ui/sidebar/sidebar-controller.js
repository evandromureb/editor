/**
 * Mobile sidebar drawer — backdrop, Escape, and slide-out behavior.
 */

/**
 * @typedef {object} SidebarControllerOptions
 * @property {HTMLElement} root
 * @property {HTMLElement} sidebar
 * @property {HTMLElement} backdrop
 */

export class SidebarController {
  /** @type {HTMLElement} */
  #root

  /** @type {HTMLElement} */
  #sidebar

  /** @type {HTMLElement} */
  #backdrop

  /** @type {MediaQueryList} */
  #mobileQuery

  /** @type {MutationObserver | null} */
  #observer = null

  /** @type {boolean} */
  #wasVisible = false

  /** @type {(event: KeyboardEvent) => void} */
  #keydownHandler

  /** @type {() => void} */
  #mediaChangeHandler

  /** @param {SidebarControllerOptions} options */
  constructor({ root, sidebar, backdrop }) {
    this.#root = root
    this.#sidebar = sidebar
    this.#backdrop = backdrop
    this.#mobileQuery = createMobileQuery()

    this.#keydownHandler = (event) => {
      if (event.key !== 'Escape') return
      if (!this.#root.classList.contains('editor--sidebar-open')) return
      event.preventDefault()
      this.closeDrawer()
    }

    this.#mediaChangeHandler = () => this.#sync()

    this.#backdrop.addEventListener('click', () => this.closeDrawer())
    document.addEventListener('keydown', this.#keydownHandler)
    this.#mobileQuery.addEventListener('change', this.#mediaChangeHandler)

    if (typeof MutationObserver === 'function') {
      this.#observer = new MutationObserver(() => this.#sync())
      this.#observer.observe(this.#sidebar, { attributes: true, attributeFilter: ['hidden'] })
    }

    this.#sync()
  }

  closeDrawer() {
    if (!this.#mobileQuery.matches) return
    this.#root.classList.remove('editor--sidebar-open')
    this.#root.classList.add('editor--sidebar-drawer-closed')
    this.#backdrop.hidden = true
  }

  #sync() {
    const mobile = this.#mobileQuery.matches
    const visible = !this.#sidebar.hidden

    if (!mobile) {
      this.#root.classList.remove('editor--sidebar-open', 'editor--sidebar-drawer-closed')
      this.#backdrop.hidden = true
      this.#wasVisible = visible
      return
    }

    if (!visible) {
      this.#root.classList.remove('editor--sidebar-open', 'editor--sidebar-drawer-closed')
      this.#backdrop.hidden = true
      this.#wasVisible = false
      return
    }

    if (!this.#wasVisible) {
      this.#root.classList.remove('editor--sidebar-drawer-closed')
    }
    this.#wasVisible = true

    if (this.#root.classList.contains('editor--sidebar-drawer-closed')) {
      this.#root.classList.remove('editor--sidebar-open')
      this.#backdrop.hidden = true
      return
    }

    this.#root.classList.add('editor--sidebar-open')
    this.#backdrop.hidden = false
  }

  destroy() {
    this.#observer?.disconnect()
    document.removeEventListener('keydown', this.#keydownHandler)
    this.#mobileQuery.removeEventListener('change', this.#mediaChangeHandler)
  }
}

/**
 * @returns {MediaQueryList | { matches: boolean, addEventListener: () => void, removeEventListener: () => void }}
 */
function createMobileQuery() {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(max-width: 767px)')
  }

  return {
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }
}
