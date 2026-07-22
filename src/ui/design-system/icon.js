/**
 * Creates an icon element with inline SVG in the DOM.
 *
 * @param {string} svgMarkup - complete SVG markup
 * @param {{ name?: string, label?: string }} [options]
 * @returns {HTMLElement}
 */
export function createIcon(svgMarkup, options = {}) {
  const { name = '', label = '' } = options

  const span = document.createElement('span')
  span.className = name ? `editor__icon editor__icon--${name}` : 'editor__icon'
  span.setAttribute('aria-hidden', 'true')

  if (svgMarkup) {
    // Safe: svgMarkup is a static icon string supplied by trusted plugin/
    // theme code at registration time (see Plugin Trust Model docs), never
    // by end-user content — the <template> is only ever used to parse it
    // into a detached <svg> element below.
    const template = document.createElement('template')
    template.innerHTML = svgMarkup
    const svg = template.content.querySelector('svg')
    if (svg) {
      span.appendChild(svg)
      return span
    }
  }

  span.textContent = label
  return span
}
