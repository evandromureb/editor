/**
 * @typedef {object} TooltipOpts
 * @property {HTMLElement} target
 * @property {string} content
 * @property {string} [className]
 */

/**
 * @param {TooltipOpts} opts
 * @returns {{ show: () => void, hide: () => void, destroy: () => void }}
 */
export function createTooltip({ target, content, className = '' }) {
  const tip = document.createElement('div')
  tip.className = ['editor__tooltip', className].filter(Boolean).join(' ')
  tip.setAttribute('role', 'tooltip')
  tip.textContent = content
  tip.hidden = true

  const show = () => {
    document.body.appendChild(tip)
    const rect = target.getBoundingClientRect()
    tip.hidden = false
    tip.style.position = 'fixed'
    tip.style.top = `${rect.bottom + 4}px`
    tip.style.left = `${rect.left + rect.width / 2 - tip.offsetWidth / 2}px`
  }

  const hide = () => {
    tip.hidden = true
    tip.remove()
  }

  target.addEventListener('mouseenter', show)
  target.addEventListener('mouseleave', hide)
  target.addEventListener('focus', show)
  target.addEventListener('blur', hide)

  return {
    show,
    hide,
    destroy: () => {
      hide()
      target.removeEventListener('mouseenter', show)
      target.removeEventListener('mouseleave', hide)
      target.removeEventListener('focus', show)
      target.removeEventListener('blur', hide)
    },
  }
}
