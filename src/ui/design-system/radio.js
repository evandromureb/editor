import { nextFormId } from './form-id.js'

/**
 * @typedef {object} RadioOpts
 * @property {string} name
 * @property {string} value
 * @property {string} [label]
 * @property {boolean} [checked]
 * @property {string} [className]
 * @property {string} [id]
 * @property {boolean} [disabled]
 * @property {(value: string) => void} [onChange]
 */

/**
 * @param {RadioOpts} opts
 * @returns {HTMLLabelElement}
 */
export function createRadio({
  name,
  value,
  label = '',
  checked = false,
  className = '',
  id,
  disabled = false,
  onChange,
}) {
  const wrapper = document.createElement('label')
  wrapper.className = ['editor__radio', className].filter(Boolean).join(' ')

  const input = document.createElement('input')
  input.type = 'radio'
  input.id = id ?? nextFormId('radio')
  input.name = name
  input.value = value
  input.checked = checked
  input.disabled = disabled
  input.className = 'editor__radio-input'
  wrapper.htmlFor = input.id

  const span = document.createElement('span')
  span.className = 'editor__radio-label'
  span.textContent = label

  wrapper.append(input, span)

  if (onChange) {
    input.addEventListener('change', () => {
      if (input.checked) onChange(value)
    })
  }

  return wrapper
}
