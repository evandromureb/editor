let counter = 0

/**
 * @param {string} prefix
 * @returns {string}
 */
export function nextFormId(prefix) {
  counter += 1
  return `editor-${prefix}-${counter}`
}
