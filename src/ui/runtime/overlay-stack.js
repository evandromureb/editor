/**
 * Overlay stack with z-index, click-outside, and Escape handling.
 */

import { isEditorChromeTarget } from './interaction-guard.js'

/**
 * @typedef {object} OverlayEntry
 * @property {string} id
 * @property {string} pluginId
 * @property {HTMLElement} element
 * @property {HTMLElement} [anchor]
 * @property {HTMLElement} [backdrop]
 * @property {() => void} [onClose]
 * @property {boolean} [modal]
 */

const BASE_Z = 1000

export class OverlayStack {
  /** @type {HTMLElement} */
  #root

  /** @type {OverlayEntry[]} */
  #stack = []

  /** @type {(e: KeyboardEvent) => void} */
  #keydownHandler

  /** @type {(e: MouseEvent) => void} */
  #clickHandler

  /** @type {(e: MouseEvent) => void} */
  #pointerDownHandler

  /**
   * @param {HTMLElement} root
   */
  constructor(root) {
    this.#root = root
    this.#root.className = 'editor__overlay-root'

    this.#keydownHandler = (e) => {
      if (e.key === 'Escape') {
        const top = this.#stack[this.#stack.length - 1]
        if (top?.onClose) {
          e.preventDefault()
          top.onClose()
        }
      }
    }

    this.#clickHandler = (e) => {
      const top = this.#stack[this.#stack.length - 1]
      if (!top?.onClose || top.modal) return

      if (top.backdrop && e.target === top.backdrop) {
        top.onClose()
      }
    }

    this.#pointerDownHandler = (e) => {
      const top = this.#stack[this.#stack.length - 1]
      if (!top?.onClose || top.modal) return

      const target = e.target
      if (!(target instanceof Node)) return
      if (isEditorChromeTarget(target)) return

      if (top.element.contains(target)) return
      if (top.anchor?.contains(target)) return

      top.onClose()
    }
  }

  getRoot() {
    return this.#root
  }

  /**
   * @param {OverlayEntry} entry
   */
  push(entry) {
    const z = BASE_Z + this.#stack.length * 10

    if (entry.modal) {
      const backdrop = document.createElement('div')
      backdrop.className = 'editor__overlay-backdrop'
      backdrop.style.zIndex = String(z)
      this.#root.appendChild(backdrop)
      entry.backdrop = backdrop
    }

    entry.element.style.zIndex = String(z + 1)
    this.#root.appendChild(entry.element)
    this.#stack.push(entry)

    if (this.#stack.length === 1) {
      document.addEventListener('keydown', this.#keydownHandler)
      document.addEventListener('mousedown', this.#pointerDownHandler, true)
      this.#root.addEventListener('click', this.#clickHandler)
    }
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  remove(id) {
    const idx = this.#stack.findIndex((e) => e.id === id)
    if (idx === -1) return false

    const entry = this.#stack[idx]
    entry.element.remove()
    entry.backdrop?.remove()
    this.#stack.splice(idx, 1)

    if (this.#stack.length === 0) {
      document.removeEventListener('keydown', this.#keydownHandler)
      document.removeEventListener('mousedown', this.#pointerDownHandler, true)
      this.#root.removeEventListener('click', this.#clickHandler)
    }

    return true
  }

  removeByPlugin(pluginId) {
    const toRemove = this.#stack.filter((e) => e.pluginId === pluginId)
    for (const entry of toRemove) {
      this.remove(entry.id)
    }
  }

  /**
   * Invokes onClose on every non-modal entry, which triggers the full close
   * chain (plugin callback + stack removal). Snapshot first to avoid
   * mutating #stack while iterating.
   */
  closeAllNonModal() {
    const toClose = this.#stack.filter((e) => !e.modal)
    for (const entry of toClose) {
      entry.onClose?.()
    }
  }

  has(id) {
    return this.#stack.some((e) => e.id === id)
  }

  get size() {
    return this.#stack.length
  }
}
