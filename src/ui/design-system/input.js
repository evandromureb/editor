import { nextFormId } from './form-id.js'

/**
 * @typedef {object} InputOpts
 * @property {string} [type]
 * @property {string} [value]
 * @property {string} [placeholder]
 * @property {string} [className]
 * @property {string} [id]
 * @property {string} [name]
 * @property {boolean} [disabled]
 * @property {(value: string) => void} [onChange]
 */

/**
 * @param {InputOpts} [opts]
 * @returns {HTMLInputElement}
 */
export function createInput({
  type = 'text',
  value = '',
  placeholder = '',
  className = '',
  id,
  name,
  disabled = false,
  onChange,
} = {}) {
  const input = document.createElement('input')
  input.type = type
  input.className = ['editor__input', className].filter(Boolean).join(' ')
  input.id = id ?? nextFormId('input')
  input.name = name ?? input.id
  input.value = value
  input.placeholder = placeholder
  input.disabled = disabled

  if (onChange) {
    input.addEventListener('input', () => onChange(input.value))
  }

  return input
}
