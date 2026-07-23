/** @typedef {import('./types.js').BlockNode} BlockNode */
/** @typedef {import('./types.js').TextBlockNode} TextBlockNode */
/** @typedef {import('./types.js').ParagraphNode} ParagraphNode */
/** @typedef {import('./types.js').TextNode} TextNode */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { getParagraphLength } from './text-utils.js'

/**
 * Returns true for any block that has editable text content (paragraph, heading-*, etc.).
 * Equivalent check: block has a `content` array (not a void block).
 *
 * @param {BlockNode} block
 * @returns {block is TextBlockNode}
 */
export function isTextBlock(block) {
  return Array.isArray(/** @type {any} */ (block).content)
}

/**
 * @param {BlockNode} block
 * @returns {block is ParagraphNode}
 */
export function isParagraphBlock(block) {
  return block.type === 'paragraph'
}

/**
 * @param {BlockNode} block
 * @param {EditorRegistries} registries
 * @returns {boolean}
 */
export function isVoidBlockNode(block, registries) {
  return registries.blocks.isVoidBlock(block.type)
}

/**
 * @param {BlockNode} block
 * @param {EditorRegistries} registries
 * @returns {block is import('./types.js').ContainerBlockNode}
 */
export function isContainerBlockNode(block, registries) {
  return registries.blocks.isContainerBlock(block.type)
}

/**
 * @param {BlockNode} block
 * @returns {BlockNode[]}
 */
export function getChildBlocks(block) {
  const children = /** @type {any} */ (block).children
  return Array.isArray(children) ? children : []
}

/**
 * @param {BlockNode} block
 * @returns {TextNode[]}
 */
export function getBlockContent(block) {
  return isTextBlock(block) ? /** @type {TextBlockNode} */ (block).content : []
}

/**
 * @param {BlockNode} block
 * @returns {number}
 */
export function getBlockLength(block) {
  return getParagraphLength(getBlockContent(block))
}
