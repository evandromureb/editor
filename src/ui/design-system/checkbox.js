import { nextFormId } from './form-id.js'

/**
 * @typedef {object} CheckboxOpts
 * @property {string} [label]
 * @property {boolean} [checked]
 * @property {string} [className]
 * @property {string} [id]
 * @property {string} [name]
 * @property {boolean} [disabled]
 * @property {(checked: boolean) => void} [onChange]
 */

/**
 * @param {CheckboxOpts} [opts]
 * @returns {HTMLLabelElement}
 */
export function createCheckbox({
  label = '',
  checked = false,
  className = '',
  id,
  name,
  disabled = false,
  onChange,
} = {}) {
  const wrapper = document.createElement('label')
  wrapper.className = ['editor__checkbox', className].filter(Boolean).join(' ')

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.id = id ?? nextFormId('checkbox')
  input.name = name ?? input.id
  input.checked = checked
  input.disabled = disabled
  input.className = 'editor__checkbox-input'
  wrapper.htmlFor = input.id

  const span = document.createElement('span')
  span.className = 'editor__checkbox-label'
  span.textContent = label

  wrapper.append(input, span)

  if (onChange) {
    input.addEventListener('change', () => onChange(input.checked))
  }

  return wrapper
}
