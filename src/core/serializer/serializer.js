/** @typedef {import('../document/types.js').DocNode} DocNode */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { serializeDocument } from '../pipeline/blocks.js'

/**
 * @param {DocNode} docNode
 * @param {EditorRegistries} registries
 * @returns {string}
 */
export function serialize(docNode, registries) {
  return serializeDocument(docNode, registries)
}
