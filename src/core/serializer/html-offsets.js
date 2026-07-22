/** @typedef {import('../document/types.js').DocNode} DocNode */
/** @typedef {import('../selection/types.js').EditorSelection} EditorSelection */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { getBlockLength, isTextBlock } from '../document/block-utils.js'
import { serializeBlock, serializeTextNode } from '../pipeline/blocks.js'
import { parse } from './parser.js'

/**
 * @param {DocNode} doc
 * @param {{ block: number, offset: number }} pos
 * @param {EditorRegistries} registries
 * @returns {number}
 */
function posToHtmlOffset(doc, pos, registries) {
  let base = 0

  for (let b = 0; b < pos.block; b++) {
    base += serializeBlock(doc.content[b], registries).length
  }

  const block = doc.content[pos.block]
  if (!block) return base

  if (!isTextBlock(block)) {
    const len = serializeBlock(block, registries).length
    return base + (pos.offset > 0 ? len : 0)
  }

  if (block.implicit) {
    let textOffset = 0
    for (const node of block.content) {
      if (textOffset >= pos.offset) break

      const chars = Math.min(node.text.length, pos.offset - textOffset)
      if (chars < node.text.length) {
        return base + serializeTextNode({ ...node, text: node.text.slice(0, chars) }, registries).length
      }

      base += serializeTextNode(node, registries).length
      textOffset += node.text.length
    }

    return base
  }

  const def = registries.blocks.getBlockByType(block.type)
  const tag = def?.tag ?? 'p'
  base += `<${tag}>`.length

  let textOffset = 0
  for (const node of block.content) {
    if (textOffset >= pos.offset) break

    const chars = Math.min(node.text.length, pos.offset - textOffset)
    if (chars < node.text.length) {
      return base + serializeTextNode({ ...node, text: node.text.slice(0, chars) }, registries).length
    }

    base += serializeTextNode(node, registries).length
    textOffset += node.text.length
  }

  return base
}

/**
 * @param {string} blockHtml
 * @param {number} innerOffset
 * @returns {number}
 */
function htmlInnerToTextOffset(blockHtml, innerOffset) {
  const openTagLen = blockHtml.indexOf('>') + 1
  if (innerOffset <= openTagLen) return 0

  const closeTagStart = blockHtml.lastIndexOf('<')
  if (closeTagStart >= 0 && innerOffset >= closeTagStart) {
    let textCount = 0
    let inTag = false
    for (let i = openTagLen; i < closeTagStart; i++) {
      const ch = blockHtml[i]
      if (ch === '<') inTag = true
      else if (ch === '>') inTag = false
      else if (!inTag) textCount++
    }
    return textCount
  }

  let textCount = 0
  let inTag = false
  for (let i = openTagLen; i < innerOffset && i < blockHtml.length; i++) {
    const ch = blockHtml[i]
    if (ch === '<') inTag = true
    else if (ch === '>') inTag = false
    else if (!inTag) textCount++
  }

  return textCount
}

/**
 * @param {string} html
 * @param {number} targetOffset
 * @param {DocNode} doc
 * @param {EditorRegistries} registries
 * @returns {{ block: number, offset: number }}
 */
function htmlOffsetToPos(html, targetOffset, doc, registries) {
  let htmlCursor = 0

  for (let blockIndex = 0; blockIndex < doc.content.length; blockIndex++) {
    const block = doc.content[blockIndex]
    const slice = html.slice(htmlCursor)
    const expected = serializeBlock(block, registries)
    let blockHtmlLen = expected.length

    if (!slice.startsWith(expected)) {
      const parsed = new DOMParser().parseFromString(slice, 'text/html')
      const first = parsed.body.firstElementChild
      blockHtmlLen = first ? first.outerHTML.length : expected.length
    }

    const blockEnd = htmlCursor + blockHtmlLen

    if (targetOffset <= blockEnd) {
      const innerOffset = targetOffset - htmlCursor
      if (!isTextBlock(block)) {
        return { block: blockIndex, offset: 0 }
      }
      const blockHtml = html.slice(htmlCursor, blockEnd)
      if (block.implicit) {
        return { block: blockIndex, offset: htmlInnerToTextOffset(blockHtml, innerOffset) }
      }
      return { block: blockIndex, offset: htmlInnerToTextOffset(blockHtml, innerOffset) }
    }

    htmlCursor = blockEnd
  }

  const lastIndex = Math.max(0, doc.content.length - 1)
  const lastBlock = doc.content[lastIndex]
  return {
    block: lastIndex,
    offset: lastBlock ? getBlockLength(lastBlock) : 0,
  }
}

/**
 * @param {DocNode} doc
 * @param {EditorSelection} selection
 * @param {EditorRegistries} registries
 * @returns {{ anchor: number, focus: number }}
 */
export function selectionToHtmlOffsets(doc, selection, registries) {
  return {
    anchor: posToHtmlOffset(doc, selection.anchor, registries),
    focus: posToHtmlOffset(doc, selection.focus, registries),
  }
}

/**
 * @param {string} html
 * @param {number} anchorOffset
 * @param {number} focusOffset
 * @param {EditorRegistries} registries
 * @returns {EditorSelection}
 */
export function htmlOffsetsToSelection(html, anchorOffset, focusOffset, registries) {
  const doc = parse(html, registries)
  const anchor = htmlOffsetToPos(html, anchorOffset, doc, registries)
  const focus = htmlOffsetToPos(html, focusOffset, doc, registries)
  return { anchor, focus }
}
