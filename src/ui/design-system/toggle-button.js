/**
 * @typedef {object} ToggleButtonOpts
 * @property {string} [label]
 * @property {string} [title]
 * @property {string} [className]
 * @property {boolean} [active]
 * @property {boolean} [disabled]
 * @property {() => void} [onClick]
 */

/**
 * Creates a toggle button (active/inactive state) with the editor's design tokens.
 *
 * @param {ToggleButtonOpts} opts
 * @returns {HTMLButtonElement}
 */
export function createToggleButton({
  label = '',
  title = '',
  className = '',
  active = false,
  disabled = false,
  onClick,
} = {}) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = ['editor__btn', 'editor__btn--toggle', className].filter(Boolean).join(' ')
  btn.title = title
  btn.textContent = label
  btn.disabled = disabled
  btn.classList.toggle('is-active', active)

  if (onClick) {
    btn.addEventListener('click', (event) => onClick(event))
  }

  return btn
}
