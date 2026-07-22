/** @typedef {import('./types.js').BlockNode} BlockNode */
/** @typedef {import('./types.js').TextBlockNode} TextBlockNode */
/** @typedef {import('./types.js').DocNode} DocNode */
/** @typedef {import('./types.js').ParagraphNode} ParagraphNode */
/** @typedef {import('./types.js').TextNode} TextNode */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { isTextBlock } from './block-utils.js'
import { textNode } from './marks.js'

/**
 * @param {TextNode[]} content
 * @param {{ implicit?: boolean }} [options]
 * @returns {ParagraphNode}
 */
export function paragraphNode(content, options = {}) {
  /** @type {ParagraphNode} */
  const node = { type: 'paragraph', content }
  if (options.implicit) node.implicit = true
  return node
}

/**
 * @param {string} type
 * @param {EditorRegistries} registries
 * @returns {BlockNode}
 */
export function createBlockNode(type, registries) {
  const def = registries.blocks.getBlockByType(type)
  if (!def) {
    throw new Error(`Block not registered: ${type}`)
  }

  if (def.void) {
    return /** @type {BlockNode} */ ({ type })
  }

  if (def.isContainer) {
    if (!def.childType) {
      throw new Error(`Container block missing childType: ${type}`)
    }
    return /** @type {import('./types.js').ContainerBlockNode} */ ({
      type,
      children: [createBlockNode(def.childType, registries)],
    })
  }

  // Non-void block: create with correct type, empty content, and any
  // declared attr defaults (e.g. a fresh task-item always gets an explicit
  // data-checked="false" rather than omitting the attribute).
  return /** @type {TextBlockNode} */ ({
    type,
    content: [textNode('', [], registries)],
    ...(def.attrDefaults ? { attrs: { ...def.attrDefaults } } : {}),
  })
}

/**
 * @param {BlockNode[]} content
 * @returns {DocNode}
 */
export function docNode(content) {
  return { type: 'doc', content }
}

/**
 * @param {BlockNode} block
 * @returns {BlockNode}
 */
export function cloneBlock(block) {
  if (block && typeof block === 'object' && Array.isArray(/** @type {any} */ (block).children)) {
    const containerBlock = /** @type {import('./types.js').ContainerBlockNode} */ (block)
    return /** @type {BlockNode} */ ({
      type: containerBlock.type,
      children: containerBlock.children.map((child) => cloneBlock(child)),
      ...(containerBlock.style && Object.keys(containerBlock.style).length
        ? { style: { ...containerBlock.style } }
        : {}),
    })
  }

  if (!isTextBlock(block)) {
    // Void blocks may carry plugin-defined data (e.g. `attrs`, `caption` for
    // an image block) beyond `type` — preserve it so undo/redo and Document
    // snapshots don't silently drop it.
    if (!block || typeof block !== 'object') return block

    return /** @type {BlockNode} */ ({
      ...block,
      ...('attrs' in block && block.attrs ? { attrs: { ...block.attrs } } : {}),
    })
  }

  const textBlock = /** @type {TextBlockNode} */ (block)
  return /** @type {TextBlockNode} */ ({
    type: textBlock.type,
    content: textBlock.content.map((node) => ({
      type: 'text',
      text: node.text,
      ...(node.marks?.length ? { marks: [...node.marks] } : {}),
      ...(node.markAttrs && Object.keys(node.markAttrs).length
        ? { markAttrs: { ...node.markAttrs } }
        : {}),
    })),
    ...(textBlock.implicit ? { implicit: true } : {}),
    ...(textBlock.style && Object.keys(textBlock.style).length
      ? { style: { ...textBlock.style } }
      : {}),
    ...(textBlock.attrs && Object.keys(textBlock.attrs).length
      ? { attrs: { ...textBlock.attrs } }
      : {}),
  })
}

/**
 * @param {DocNode} doc
 * @returns {DocNode}
 */
export function cloneDoc(doc) {
  return {
    type: 'doc',
    content: doc.content.map((block) => cloneBlock(block)),
  }
}

export { textNode }
