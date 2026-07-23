/**
 * @typedef {object} SelectTriggerOpts
 * @property {string} label
 * @property {string} [className]
 * @property {string} [id]
 * @property {boolean} [disabled]
 */

/**
 * @param {SelectTriggerOpts} opts
 * @returns {HTMLButtonElement}
 */
export function createSelectTrigger({ label, className = '', id, disabled = false }) {
  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = ['bl-select__trigger', className].filter(Boolean).join(' ')
  trigger.setAttribute('aria-haspopup', 'listbox')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.disabled = disabled

  if (id) {
    trigger.id = id
  }

  const valueEl = document.createElement('span')
  valueEl.className = 'bl-select__value'
  valueEl.textContent = label

  const arrow = document.createElement('span')
  arrow.className = 'bl-select__arrow'
  arrow.setAttribute('aria-hidden', 'true')
  arrow.textContent = '▼'

  trigger.append(valueEl, arrow)
  return trigger
}
