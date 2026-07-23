/**
 * @param {string} [className]
 * @returns {HTMLElement}
 */
export function createSeparator(className = '') {
  const el = document.createElement('div')
  el.className = ['editor__separator', className].filter(Boolean).join(' ')
  el.setAttribute('role', 'separator')
  return el
}

/**
 * @param {'horizontal' | 'vertical'} [orientation]
 * @returns {HTMLElement}
 */
export function createDivider(orientation = 'horizontal') {
  const el = document.createElement('hr')
  el.className = `editor__divider editor__divider--${orientation}`
  return el
}
