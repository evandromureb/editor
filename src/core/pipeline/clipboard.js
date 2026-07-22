import { sanitizeHtml } from '../sanitize/sanitize.js'

/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

/**
 * @param {DataTransfer | null} clipboardData
 * @param {EditorRegistries} registries
 * @returns {string | null}
 */
export function extractPasteHtml(clipboardData, registries) {
  if (!clipboardData) return null

  const html = clipboardData.getData('text/html').trim()
  if (!html) return null

  const sanitized = sanitizeHtml(html, registries)
  return sanitized || null
}

/**
 * @param {DataTransfer | null} clipboardData
 * @param {EditorRegistries} registries
 * @returns {string}
 */
export function extractPasteText(clipboardData, registries) {
  if (!clipboardData) return ''

  const html = extractPasteHtml(clipboardData, registries)
  if (html) {
    return htmlToPlainText(html)
  }

  return clipboardData.getData('text/plain')
}

/**
 * @param {string} html
 * @returns {string}
 */
function htmlToPlainText(html) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const blocks = []

  for (const node of parsed.body.childNodes) {
    const text = blockText(node)
    if (text || blocks.length > 0) {
      blocks.push(text)
    }
  }

  if (blocks.length === 0) {
    return parsed.body.textContent ?? ''
  }

  return blocks.join('\n')
}

/**
 * @param {Node} node
 * @returns {string}
 */
function blockText(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = /** @type {HTMLElement} */ (node)
  if (element.tagName.toLowerCase() === 'br') return ''

  return element.textContent ?? ''
}
