/** @typedef {import('../document/types.js').DocNode} DocNode */
/** @typedef {import('./cursor-types.js').Pos} Pos */
/** @typedef {import('./cursor-types.js').EditorSelection} EditorSelection */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import {
  getBlockLength,
  getChildBlocks,
  isContainerBlockNode,
  isTextBlock,
  isVoidBlockNode,
} from '../document/block-utils.js'
import { paragraphNode, textNode, docNode } from '../document/nodes.js'

/**
 * @param {DocNode} doc
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {Pos}
 */
export function resolvePos(doc, pos, registries) {
  const content = doc.content.length ? doc.content : [paragraphNode([textNode('')])]

  let block = Math.max(0, Math.min(pos.block, content.length - 1))
  const node = content[block]

  if (isContainerBlockNode(node, registries)) {
    return resolveContainerChildPos(node, block, pos, registries)
  }

  if (isVoidBlockNode(node, registries)) {
    return resolveVoidPos(content, block, registries)
  }

  if (!isTextBlock(node)) {
    return resolveVoidPos(content, block, registries)
  }

  const maxOffset = getBlockLength(node)
  const offset = Math.max(0, Math.min(pos.offset, maxOffset))
  return { block, offset }
}

/**
 * Resolves a `Pos` that targets (or should land inside) a container block's
 * children — clamps `childIndex` to a valid child and `offset` to that
 * child's own text length. A bare container-level `Pos` (no `childIndex`)
 * lands in the first child rather than skipping the container entirely.
 *
 * @param {import('../document/types.js').ContainerBlockNode} node
 * @param {number} block
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {Pos}
 */
function resolveContainerChildPos(node, block, pos, registries) {
  const children = getChildBlocks(node)
  if (!children.length) return { block, offset: 0 }

  const childIndex = Math.max(0, Math.min(pos.childIndex ?? 0, children.length - 1))
  const child = children[childIndex]
  const maxOffset = getBlockLength(child)
  const offset = Math.max(0, Math.min(pos.offset, maxOffset))
  return { block, childIndex, offset }
}

/**
 * @param {DocNode} doc
 * @param {EditorSelection} selection
 * @param {EditorRegistries} registries
 * @returns {EditorSelection}
 */
export function resolveSelection(doc, selection, registries) {
  return {
    anchor: resolvePos(doc, selection.anchor, registries),
    focus: resolvePos(doc, selection.focus, registries),
  }
}

/**
 * @param {import('../document/types.js').BlockNode[]} content
 * @param {number} blockIndex
 * @param {EditorRegistries} registries
 * @returns {Pos}
 */
function resolveVoidPos(content, blockIndex, registries) {
  for (let i = blockIndex - 1; i >= 0; i--) {
    const block = content[i]
    if (isContainerBlockNode(block, registries)) {
      const children = getChildBlocks(block)
      if (children.length) {
        const lastIndex = children.length - 1
        return { block: i, childIndex: lastIndex, offset: getBlockLength(children[lastIndex]) }
      }
    }
    if (isTextBlock(block)) {
      return { block: i, offset: getBlockLength(block) }
    }
  }

  for (let i = blockIndex + 1; i < content.length; i++) {
    const block = content[i]
    if (isContainerBlockNode(block, registries)) {
      const children = getChildBlocks(block)
      if (children.length) return { block: i, childIndex: 0, offset: 0 }
    }
    if (isTextBlock(block)) {
      return { block: i, offset: 0 }
    }
  }

  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (isContainerBlockNode(block, registries)) {
      const children = getChildBlocks(block)
      if (children.length) return { block: i, childIndex: 0, offset: 0 }
    }
    if (isTextBlock(block)) {
      return { block: i, offset: 0 }
    }
  }

  return { block: 0, offset: 0 }
}

/**
 * Ensures the document has at least one editable paragraph.
 *
 * @param {DocNode} doc
 * @returns {DocNode}
 */
export function ensureEditableDoc(doc) {
  if (!doc.content.length) {
    return docNode([paragraphNode([textNode('')])])
  }

  return doc
}
