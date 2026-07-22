/**
 * @typedef {object} MenuItemOpts
 * @property {string} id
 * @property {string} label
 * @property {boolean} [disabled]
 * @property {boolean} [separator]
 * @property {() => void} [onClick]
 */

/**
 * @typedef {object} MenuOpts
 * @property {MenuItemOpts[]} items
 * @property {string} [className]
 */

/**
 * @param {MenuOpts} opts
 * @returns {HTMLElement}
 */
export function createMenu({ items, className = '' }) {
  const menu = document.createElement('div')
  menu.className = ['editor__menu', className].filter(Boolean).join(' ')
  menu.setAttribute('role', 'menu')

  for (const item of items) {
    if (item.separator) {
      const sep = document.createElement('hr')
      sep.className = 'editor__menu-separator'
      menu.appendChild(sep)
      continue
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'editor__menu-item'
    btn.setAttribute('role', 'menuitem')
    btn.textContent = item.label
    btn.disabled = item.disabled ?? false
    btn.dataset.menuId = item.id

    if (item.onClick) {
      btn.addEventListener('click', () => item.onClick?.())
    }

    menu.appendChild(btn)
  }

  return menu
}
