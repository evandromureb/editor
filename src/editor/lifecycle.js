/**
 * @param {HTMLTextAreaElement | string} textarea
 * @returns {HTMLTextAreaElement}
 */
export function resolveTextarea(textarea) {
  if (typeof textarea === 'string') {
    const element = document.querySelector(textarea)
    if (!(element instanceof HTMLTextAreaElement)) {
      throw new Error(`Textarea not found: ${textarea}`)
    }
    return element
  }
  return textarea
}

/**
 * @param {HTMLElement | string | undefined} root
 * @returns {HTMLElement}
 */
export function resolveRoot(root) {
  if (!root) {
    const element = document.createElement('div')
    document.body.appendChild(element)
    return element
  }

  if (typeof root === 'string') {
    const element = document.querySelector(root)
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Root element not found: ${root}`)
    }
    return element
  }

  return root
}
