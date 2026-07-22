import { nextFormId } from './form-id.js'

/**
 * @typedef {object} TextareaOpts
 * @property {string} [value]
 * @property {string} [placeholder]
 * @property {number} [rows]
 * @property {string} [className]
 * @property {string} [id]
 * @property {string} [name]
 * @property {boolean} [disabled]
 * @property {(value: string) => void} [onChange]
 */

/**
 * @param {TextareaOpts} [opts]
 * @returns {HTMLTextAreaElement}
 */
export function createTextarea({
  value = '',
  placeholder = '',
  rows = 3,
  className = '',
  id,
  name,
  disabled = false,
  onChange,
} = {}) {
  const textarea = document.createElement('textarea')
  textarea.className = ['editor__textarea', className].filter(Boolean).join(' ')
  textarea.id = id ?? nextFormId('textarea')
  textarea.name = name ?? textarea.id
  textarea.value = value
  textarea.placeholder = placeholder
  textarea.rows = rows
  textarea.disabled = disabled

  if (onChange) {
    textarea.addEventListener('input', () => onChange(textarea.value))
  }

  return textarea
}
