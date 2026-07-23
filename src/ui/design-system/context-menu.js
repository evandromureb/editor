import { createMenu } from './menu.js'

/**
 * @typedef {import('./menu.js').MenuItemOpts} MenuItemOpts
 */

/**
 * @typedef {object} ContextMenuOpts
 * @property {MenuItemOpts[]} items
 */

/**
 * @param {ContextMenuOpts} opts
 * @returns {HTMLElement}
 */
export function createContextMenuElement({ items }) {
  const menu = createMenu({ items, className: 'editor__context-menu' })
  menu.setAttribute('role', 'menu')
  return menu
}
