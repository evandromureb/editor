/**
 * Plugin UI Runtime — visual infrastructure for plugins.
 * Manages overlays, popovers, dialogs, slots, and visual lifecycle.
 */

import { OverlayStack } from './overlay-stack.js'
import { createFocusTrap } from './focus-trap.js'
import { positionElement, flipPlacement } from './positioning.js'
import { SlotManager } from '../slots/slot-manager.js'

/**
 * @typedef {import('../slots/slot-manager.js').SlotName} SlotName
 */

// Safe: static SVG markup baked into this module, never derived from
// plugin/user input — all innerHTML assignments below just render this icon.
const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M2.146 2.146a.5.5 0 0 1 .708 0L8 7.293l5.146-5.147a.5.5 0 1 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854a.5.5 0 0 1 0-.708"/></svg>`

/**
 * @typedef {object} OverlayOpts
 * @property {string} id
 * @property {HTMLElement} element
 * @property {HTMLElement} [anchor]
 * @property {() => void} [onClose]
 * @property {boolean} [modal]
 */

/**
 * @typedef {object} DialogOpts
 * @property {string} id
 * @property {string} [title]
 * @property {HTMLElement | string} [content]
 * @property {HTMLElement} [footer]
 * @property {() => void} [onClose]
 * @property {string} [className] Extra class appended to the dialog root,
 *   for plugin-scoped size/density overrides.
 * @property {boolean} [showCloseButton=true]
 */

/**
 * @typedef {object} PopoverOpts
 * @property {string} id
 * @property {HTMLElement} anchor
 * @property {HTMLElement | string} content
 * @property {import('./positioning.js').Placement} [placement]
 * @property {() => void} [onClose]
 * @property {HTMLElement} [boundary] Overrides the runtime's default
 *   boundary for this popover only (e.g. the editable pane, so it never
 *   covers the toolbar/statusbar).
 * @property {boolean} [lockPlacement] Forces `placement` (e.g. always
 *   'bottom') and never flips to the anchor's opposite side when there
 *   isn't enough room — the popover shrinks with internal scroll instead.
 */

/**
 * @typedef {object} PluginUiRuntimeDeps
 * @property {HTMLElement} overlayRoot
 * @property {HTMLElement} [boundary] Element popovers/overlays must stay
 *   within (e.g. the editor root). Falls back to the viewport when omitted.
 * @property {Record<string, HTMLElement>} slotContainers
 */

export class PluginUiRuntime {
  /** @type {OverlayStack} */
  #overlayStack

  /** @type {SlotManager} */
  #slots

  /** @type {HTMLElement | undefined} */
  #boundary

  /** @type {Map<string, import('./focus-trap.js').FocusTrap>} */
  #focusTraps = new Map()

  /** @type {Map<string, () => void>} */
  #repositionHandlers = new Map()

  /**
   * @param {PluginUiRuntimeDeps} deps
   */
  constructor({ overlayRoot, boundary, slotContainers }) {
    this.#overlayStack = new OverlayStack(overlayRoot)
    this.#boundary = boundary
    this.#slots = new SlotManager(slotContainers)
  }

  /** @returns {SlotManager} */
  get slots() {
    return this.#slots
  }

  /** @returns {OverlayStack} */
  get overlayStack() {
    return this.#overlayStack
  }

  /**
   * @param {string} pluginId
   * @param {OverlayOpts} opts
   */
  registerOverlay(pluginId, opts) {
    this.#overlayStack.push({
      id: opts.id,
      pluginId,
      element: opts.element,
      anchor: opts.anchor,
      onClose: opts.onClose,
      modal: opts.modal ?? false,
    })

    if (opts.anchor) {
      const handler = () =>
        positionElement({ anchor: opts.anchor, element: opts.element, boundary: this.#boundary })
      handler()
      window.addEventListener('scroll', handler, true)
      window.addEventListener('resize', handler)
      this.#repositionHandlers.set(opts.id, () => {
        window.removeEventListener('scroll', handler, true)
        window.removeEventListener('resize', handler)
      })
    }
  }

  /**
   * @param {string} pluginId
   * @param {DialogOpts} opts
   * @returns {{ close: () => void }}
   */
  openDialog(pluginId, opts) {
    const dialog = document.createElement('div')
    dialog.className = opts.className ? `editor__dialog ${opts.className}` : 'editor__dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    if (opts.title) {
      dialog.setAttribute('aria-label', opts.title)
    }

    const close = () => this.closeDialog(opts.id)

    if (opts.title || opts.showCloseButton !== false) {
      const header = document.createElement('div')
      header.className = 'editor__dialog-header'
      if (opts.title) {
        const titleEl = document.createElement('span')
        titleEl.className = 'editor__dialog-title'
        titleEl.textContent = opts.title
        header.appendChild(titleEl)
      }
      if (opts.showCloseButton !== false) {
        const closeBtn = document.createElement('button')
        closeBtn.type = 'button'
        closeBtn.className = 'editor__dialog-close'
        closeBtn.setAttribute('aria-label', 'Close')
        closeBtn.innerHTML = CLOSE_ICON
        closeBtn.addEventListener('click', () => {
          opts.onClose?.()
          close()
        })
        header.appendChild(closeBtn)
      }
      dialog.appendChild(header)
    }

    const body = document.createElement('div')
    body.className = 'editor__dialog-body'
    if (typeof opts.content === 'string') {
      body.textContent = opts.content
    } else if (opts.content) {
      body.appendChild(opts.content)
    }
    dialog.appendChild(body)

    if (opts.footer) {
      const footer = document.createElement('div')
      footer.className = 'editor__dialog-footer'
      footer.appendChild(opts.footer)
      dialog.appendChild(footer)
    }

    this.#overlayStack.push({
      id: opts.id,
      pluginId,
      element: dialog,
      onClose: () => {
        opts.onClose?.()
        close()
      },
      modal: true,
    })

    const trap = createFocusTrap(dialog)
    trap.activate()
    this.#focusTraps.set(opts.id, trap)

    return { close }
  }

  /** @param {string} id */
  closeDialog(id) {
    const trap = this.#focusTraps.get(id)
    trap?.deactivate()
    this.#focusTraps.delete(id)
    this.#cleanupReposition(id)
    this.#overlayStack.remove(id)
  }

  /**
   * @param {string} pluginId
   * @param {PopoverOpts} opts
   * @returns {{ close: () => void }}
   */
  openPopover(pluginId, opts) {
    this.#overlayStack.closeAllNonModal()

    const popover = document.createElement('div')
    popover.className = 'editor__popover'
    popover.setAttribute('role', 'dialog')

    if (typeof opts.content === 'string') {
      popover.textContent = opts.content
    } else {
      popover.appendChild(opts.content)
    }

    const close = () => this.closePopover(opts.id)

    this.#overlayStack.push({
      id: opts.id,
      pluginId,
      element: popover,
      anchor: opts.anchor,
      onClose: () => {
        opts.onClose?.()
        close()
      },
      modal: false,
    })

    // Measured only after `push()` appends it to the DOM — a detached
    // element's getBoundingClientRect() is always zero-sized, which would
    // throw off the anchor-centered/flip math below.
    const boundary = opts.boundary ?? this.#boundary
    const preferredPlacement = opts.placement ?? 'bottom'
    const placement = opts.lockPlacement
      ? preferredPlacement
      : flipPlacement(opts.anchor, popover, preferredPlacement, boundary)
    positionElement({
      anchor: opts.anchor,
      element: popover,
      placement,
      boundary,
      lockPlacement: opts.lockPlacement,
    })

    const handler = () =>
      positionElement({
        anchor: opts.anchor,
        element: popover,
        placement,
        boundary,
        lockPlacement: opts.lockPlacement,
      })
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    this.#repositionHandlers.set(opts.id, () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    })

    return { close }
  }

  /** @param {string} id */
  closePopover(id) {
    this.#cleanupReposition(id)
    this.#overlayStack.remove(id)
  }

  /**
   * @param {SlotName} slot
   * @param {string} pluginId
   * @param {HTMLElement} element
   * @param {string} [id]
   */
  mountSlot(slot, pluginId, element, id = element.dataset.pluginSlot ?? `slot-${Date.now()}`) {
    this.#slots.mount(slot, pluginId, id, element)
  }

  /**
   * @param {SlotName} slot
   * @param {string} pluginId
   * @param {string} id
   */
  unmountSlot(slot, pluginId, id) {
    this.#slots.unmount(slot, pluginId, id)
  }

  closeAllNonModal() {
    this.#overlayStack.closeAllNonModal()
  }

  /** @param {string} pluginId */
  unregisterPlugin(pluginId) {
    this.#overlayStack.removeByPlugin(pluginId)
    this.#slots.unmountAll(pluginId)

    for (const id of [...this.#focusTraps.keys()]) {
      const trap = this.#focusTraps.get(id)
      trap?.deactivate()
      this.#focusTraps.delete(id)
    }

    for (const id of [...this.#repositionHandlers.keys()]) {
      this.#cleanupReposition(id)
    }
  }

  /** @param {string} id */
  #cleanupReposition(id) {
    const cleanup = this.#repositionHandlers.get(id)
    cleanup?.()
    this.#repositionHandlers.delete(id)
  }
}
