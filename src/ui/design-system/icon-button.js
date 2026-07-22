import { createButton } from './button.js'
import { createIcon } from './icon.js'

/**
 * @typedef {object} IconButtonOpts
 * @property {string} [icon]
 * @property {string} [iconSvg]
 * @property {string} [iconClass]
 * @property {string} [title]
 * @property {string} [className]
 * @property {boolean} [disabled]
 * @property {() => void} [onClick]
 */

/**
 * @param {IconButtonOpts} [opts]
 * @returns {HTMLButtonElement}
 */
export function createIconButton({
  icon = '',
  iconSvg = '',
  iconClass = '',
  title = '',
  className = '',
  disabled = false,
  onClick,
} = {}) {
  const btn = createButton({ title, className: `editor__icon-btn ${className}`, onClick })
  btn.disabled = disabled
  btn.textContent = ''

  if (iconSvg) {
    btn.appendChild(createIcon(iconSvg, { name: iconClass, label: icon }))
  } else if (icon) {
    btn.appendChild(createIcon('', { label: icon }))
  }

  return btn
}
