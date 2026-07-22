/**
 * @typedef {object} ButtonOpts
 * @property {string} [label]
 * @property {string} [title]
 * @property {string} [className]
 * @property {() => void} [onClick]
 */

/**
 * Creates a simple button with the editor's design tokens.
 *
 * @param {ButtonOpts} opts
 * @returns {HTMLButtonElement}
 */
export function createButton({ label = '', title = '', className = '', onClick } = {}) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = ['editor__btn', className].filter(Boolean).join(' ')
  btn.title = title
  btn.textContent = label

  if (onClick) {
    btn.addEventListener('click', onClick)
  }

  return btn
}
