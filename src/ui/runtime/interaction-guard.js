/** @type {Set<string>} */
const chromeSelectors = new Set()

/**
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
export function isEditorChromeTarget(target) {
  if (!target || typeof target !== 'object') return false
  if (!('closest' in target) || typeof target.closest !== 'function') return false

  for (const selector of chromeSelectors) {
    if (target.closest(selector)) return true
  }

  return false
}

/**
 * @param {string} selector
 */
export function registerChromeSelector(selector) {
  chromeSelectors.add(selector)
}
