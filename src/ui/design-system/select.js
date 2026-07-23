/**
 * @typedef {object} SelectOption
 * @property {string} value
 * @property {string} label
 */

import { nextFormId } from './form-id.js'

/**
 * @typedef {object} SelectOpts
 * @property {SelectOption[]} [options]
 * @property {string} [value]
 * @property {string} [className]
 * @property {string} [id]
 * @property {string} [name]
 * @property {boolean} [disabled]
 * @property {(value: string) => void} [onChange]
 */

/**
 * @param {SelectOpts} [opts]
 * @returns {HTMLSelectElement}
 */
export function createSelect({
  options = [],
  value = '',
  className = '',
  id,
  name,
  disabled = false,
  onChange,
} = {}) {
  const select = document.createElement('select')
  select.className = ['editor__select', className].filter(Boolean).join(' ')
  select.id = id ?? nextFormId('select')
  select.name = name ?? select.id
  select.disabled = disabled

  for (const opt of options) {
    const option = document.createElement('option')
    option.value = opt.value
    option.textContent = opt.label
    select.appendChild(option)
  }

  select.value = value

  if (onChange) {
    select.addEventListener('change', () => onChange(select.value))
  }

  return select
}
