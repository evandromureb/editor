/**
 * @typedef {object} SelectItemOpts
 * @property {string} value
 * @property {string} label
 * @property {boolean} [disabled]
 * @property {string} [fontFamily]
 */

/**
 * @param {SelectItemOpts} opts
 * @returns {HTMLButtonElement}
 */
export function createSelectItem({ value, label, disabled = false, fontFamily }) {
  const item = document.createElement('button')
  item.type = 'button'
  item.className = 'bl-select__item'
  item.setAttribute('role', 'option')
  item.dataset.value = value
  item.disabled = disabled

  const check = document.createElement('span')
  check.className = 'bl-select__check'
  check.setAttribute('aria-hidden', 'true')
  check.textContent = '✓'

  const labelEl = document.createElement('span')
  labelEl.className = 'bl-select__label'
  labelEl.textContent = label
  if (fontFamily) {
    labelEl.style.fontFamily = fontFamily
  }

  item.append(check, labelEl)
  return item
}
