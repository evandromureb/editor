/** @typedef {import('../document/types.js').DocNode} DocNode */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { docNode, paragraphNode, textNode } from '../document/nodes.js'
import { sanitizeHtml } from '../sanitize/sanitize.js'
import { parseDocumentBody } from '../pipeline/blocks.js'

/**
 * @param {string} html
 * @param {EditorRegistries} registries
 * @returns {DocNode}
 */
export function parse(html, registries) {
  const trimmed = html.trim()

  if (!trimmed) {
    return docNode([paragraphNode([textNode('')])])
  }

  const safe = sanitizeHtml(trimmed, registries)

  if (!safe) {
    return docNode([paragraphNode([textNode('')])])
  }

  const parsed = new DOMParser().parseFromString(safe, 'text/html')
  return parseDocumentBody(parsed.body, registries)
}
