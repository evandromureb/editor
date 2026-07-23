/** @typedef {import('../document/types.js').DocNode} DocNode */
/** @typedef {import('../selection/types.js').EditorSelection} EditorSelection */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { paragraphNode, textNode } from '../document/nodes.js'
import { getChildBlocks } from '../document/block-utils.js'
import { writeToDom } from '../cursor/mapper.js'
import { getBlockChildren, getContainerChildren } from '../cursor/dom-points.js'
import {
  blockSignature,
  containerSignature,
  createBlockElement,
  createChildBlockElement,
  applyAllowedBlockStyle,
} from '../pipeline/blocks.js'

/**
 * @typedef {object} RenderOptions
 * @property {boolean} [editable=true]
 * @property {EditorSelection} [selection]
 * @property {EditorRegistries} registries
 */

/**
 * Diffs `blocks` against `parentElement`'s existing children (as reported by
 * `getSiblings`), patching only the entries whose signature changed instead
 * of rebuilding the whole list. Shared by the root-level document diff and
 * the per-container children diff — same logic, different scope.
 *
 * @param {import('../document/types.js').BlockNode[]} blocks
 * @param {HTMLElement} parentElement
 * @param {{
 *   getSiblings: (el: HTMLElement) => HTMLElement[],
 *   createElement: (block: import('../document/types.js').BlockNode, index: number) => HTMLElement,
 *   indexAttr: 'blockIndex' | 'childIndex',
 *   getSignature: (block: import('../document/types.js').BlockNode) => string,
 * }} options
 */
function diffBlockList(
  blocks,
  parentElement,
  { getSiblings, createElement, indexAttr, getSignature }
) {
  blocks.forEach((block, index) => {
    const signature = getSignature(block)
    const siblings = getSiblings(parentElement)
    const existing = siblings[index]

    if (existing instanceof HTMLElement && existing.dataset.blockSig === signature) {
      if (existing.dataset[indexAttr] !== String(index)) {
        existing.dataset[indexAttr] = String(index)
      }
      if (indexAttr === 'blockIndex' && block && typeof block === 'object' && 'children' in block) {
        syncContainerElement(existing, block)
      }
      return
    }

    const element = createElement(block, index)

    if (existing) {
      existing.replaceWith(element)
      return
    }

    const next = siblings[index]
    if (next) {
      next.before(element)
    } else {
      parentElement.appendChild(element)
    }
  })

  getSiblings(parentElement).forEach((element, index) => {
    if (index >= blocks.length) {
      element.remove()
    }
  })
}

/**
 * @param {HTMLElement} element
 * @param {import('../document/types.js').ContainerBlockNode} block
 */
function syncContainerElement(element, block) {
  const style = block.style && Object.keys(block.style).length ? block.style : undefined
  applyAllowedBlockStyle(element, style)
}

/**
 * @param {DocNode} docNode
 * @param {HTMLElement} rootElement
 * @param {RenderOptions} options
 */
export function render(docNode, rootElement, options) {
  const { editable = true, selection, registries } = options
  const blocks = docNode.content.length ? docNode.content : [paragraphNode([textNode('')])]

  rootElement.contentEditable = String(editable)

  diffBlockList(blocks, rootElement, {
    getSiblings: getBlockChildren,
    createElement: (block, index) => createBlockElement(block, index, registries),
    indexAttr: 'blockIndex',
    // A container's own root-level entry uses a shallow (type-only)
    // signature — its children change on every keystroke inside any item,
    // and wholesale-replacing the container element on every change would
    // steal focus and break IME composition. Per-child diffing below
    // patches only the item that actually changed.
    getSignature: (block) =>
      registries.blocks.isContainerBlock(block.type)
        ? containerSignature(block.type)
        : blockSignature(block),
  })

  getBlockChildren(rootElement).forEach((element, index) => {
    const block = blocks[index]
    if (!block || !registries.blocks.isContainerBlock(block.type)) return

    diffBlockList(getChildBlocks(block), element, {
      getSiblings: getContainerChildren,
      createElement: (child, childIndex) => createChildBlockElement(child, childIndex, registries),
      indexAttr: 'childIndex',
      getSignature: blockSignature,
    })
  })

  if (selection) {
    writeToDom(rootElement, selection)
  }
}
