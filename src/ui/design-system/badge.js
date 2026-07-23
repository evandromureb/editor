/**
 * @typedef {object} BadgeOpts
 * @property {string} label
 * @property {'default' | 'info' | 'success' | 'warning'} [variant]
 */

/**
 * @param {BadgeOpts} opts
 * @returns {HTMLElement}
 */
export function createBadge({ label, variant = 'default' }) {
  const el = document.createElement('span')
  el.className = `editor__badge editor__badge--${variant}`
  el.textContent = label
  return el
}
