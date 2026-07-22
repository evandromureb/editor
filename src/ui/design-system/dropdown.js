import { createButton } from './button.js'
import { createMenu } from './menu.js'

/**
 * @typedef {import('./menu.js').MenuItemOpts} MenuItemOpts
 */

/**
 * @typedef {object} DropdownOpts
 * @property {string} label
 * @property {MenuItemOpts[]} items
 * @property {string} [className]
 */

/**
 * @param {DropdownOpts} opts
 * @returns {HTMLElement}
 */
export function createDropdown({ label, items, className = '' }) {
  const wrapper = document.createElement('div')
  wrapper.className = ['editor__dropdown', className].filter(Boolean).join(' ')

  const trigger = createButton({
    label,
    className: 'editor__dropdown-trigger',
  })

  const panel = createMenu({ items, className: 'editor__dropdown-menu' })
  panel.hidden = true

  trigger.addEventListener('click', () => {
    panel.hidden = !panel.hidden
  })

  wrapper.append(trigger, panel)
  return wrapper
}
