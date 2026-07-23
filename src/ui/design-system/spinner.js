/**
 * @param {string} [className]
 * @param {(key: string) => string} [t]
 * @returns {HTMLElement}
 */
export function createSpinner(className = '', t = (k) => k) {
  const el = document.createElement('span')
  el.className = ['editor__spinner', className].filter(Boolean).join(' ')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-label', t('ui.spinner.loading'))
  return el
}
