/** @typedef {import('./types.js').DocNode} DocNode */

import { getBlockContent } from './block-utils.js'
import { cloneDoc, docNode, paragraphNode, textNode } from './nodes.js'

/**
 * @param {string} [text]
 * @returns {Document}
 */
export function createDocument(text = '') {
  return new Document(docNode([paragraphNode([textNode(text)])]))
}

export class Document {
  /** @type {DocNode} */
  #state

  /** @param {DocNode} state */
  constructor(state) {
    this.#state = cloneDoc(state)
  }

  /** @returns {DocNode} */
  toJSON() {
    return cloneDoc(this.#state)
  }

  /** @returns {string} */
  getText() {
    return this.#state.content
      .map((block) => {
        if (block.type === 'hr') return '---'
        return getBlockContent(block)
          .map((node) => node.text)
          .join('')
      })
      .join('\n')
  }

  /** @param {DocNode} docNode */
  replaceContent(docNode) {
    this.#state = cloneDoc(docNode)
  }
}
