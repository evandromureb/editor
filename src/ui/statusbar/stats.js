/** @typedef {import('../../core/document/types.js').DocNode} DocNode */
/** @typedef {import('../../core/selection/types.js').EditorSelection} EditorSelection */

import { getBlockContent } from '../../core/document/block-utils.js'

/**
 * @param {DocNode} doc
 * @param {EditorSelection} selection
 * @param {string} [paragraphLabel]
 * @returns {{ block: string, words: number, chars: number }}
 */
export function computeStats(doc, selection, paragraphLabel = 'P') {
  const text = doc.content
    .map((block) =>
      getBlockContent(block)
        .map((node) => node.text)
        .join('')
    )
    .join('\n')
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const blockIndex = selection.focus.block + 1

  return {
    block: `${paragraphLabel} ${blockIndex}`,
    words,
    chars: text.length,
  }
}

/**
 * @param {string} html
 * @param {string} [paragraphLabel]
 * @returns {{ block: string, words: number, chars: number }}
 */
export function computeHtmlStats(html, paragraphLabel = 'P') {
  const text = html.replace(/<[^>]+>/g, '')
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0

  return {
    block: `${paragraphLabel} —`,
    words,
    chars: text.length,
  }
}
