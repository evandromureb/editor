/**
 * Displays a selection menu (bubble) anchored to the editor selection.
 */

import { buildMenuItemsFromMenuDefs } from './menu-from-defs.js'
import { createContextMenuElement } from '../design-system/context-menu.js'

/**
 * @typedef {import('../../core/plugins/runtime.js').MenuDefWithPlugin} MenuDefWithPlugin
 * @typedef {import('./plugin-ui-runtime.js').PluginUiRuntime} PluginUiRuntime
 */

/**
 * @typedef {object} SelectionMenuControllerDeps
 * @property {HTMLElement} surface
 * @property {() => string} getMode
 * @property {() => import('../../core/selection/types.js').EditorSelection} getSelection
 * @property {() => MenuDefWithPlugin[]} getDefs
 * @property {(pluginId: string) => import('../../sdk/types.js').PluginContext | null} getPluginCtx
 * @property {PluginUiRuntime} uiRuntime
 * @property {(key: string) => string} t
 */

export class SelectionMenuController {
  /** @type {SelectionMenuControllerDeps} */
  #deps

  /** @type {string | null} */
  #openId = null

  /** @param {SelectionMenuControllerDeps} deps */
  constructor(deps) {
    this.#deps = deps
    deps.surface.addEventListener('mouseup', () => this.#onSelectionChange())
    document.addEventListener('selectionchange', () => this.#onSelectionChange())
  }

  #onSelectionChange() {
    if (this.#deps.getMode() !== 'editor') {
      this.#close()
      return
    }

    const selection = this.#deps.getSelection()
    const collapsed =
      selection.anchor.block === selection.focus.block &&
      selection.anchor.offset === selection.focus.offset

    if (collapsed) {
      this.#close()
      return
    }

    const defs = this.#deps.getDefs()
    if (defs.length === 0) {
      this.#close()
      return
    }

    const items = buildMenuItemsFromMenuDefs(defs, (id) => this.#deps.getPluginCtx(id))
    if (items.length === 0) {
      this.#close()
      return
    }

    const domSel = window.getSelection()
    if (!domSel || domSel.rangeCount === 0) {
      this.#close()
      return
    }

    const range = domSel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      this.#close()
      return
    }

    this.#close()

    const anchor = document.createElement('div')
    anchor.style.position = 'fixed'
    anchor.style.top = `${rect.top}px`
    anchor.style.left = `${rect.left + rect.width / 2}px`
    anchor.style.width = '1px'
    anchor.style.height = `${rect.height}px`
    anchor.style.pointerEvents = 'none'
    document.body.appendChild(anchor)

    const menu = createContextMenuElement({ items })
    const id = `selection-menu-${Date.now()}`
    this.#openId = id

    this.#deps.uiRuntime.openPopover('selection-menu', {
      id,
      anchor,
      content: menu,
      placement: 'top',
      onClose: () => {
        anchor.remove()
        this.#openId = null
      },
    })
  }

  #close() {
    if (this.#openId) {
      this.#deps.uiRuntime.closePopover(this.#openId)
      this.#openId = null
    }
  }

  destroy() {
    this.#close()
  }
}
