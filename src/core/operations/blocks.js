/** @typedef {import('../document/types.js').BlockNode} BlockNode */
/** @typedef {import('../document/types.js').DocNode} DocNode */
/** @typedef {import('../selection/types.js').EditorSelection} EditorSelection */
/** @typedef {import('../selection/types.js').Pos} Pos */
/** @typedef {import('./types.js').EditorState} EditorState */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import {
  getBlockContent,
  getBlockLength,
  isTextBlock,
  isVoidBlockNode,
} from '../document/block-utils.js'
import { createBlockNode, docNode, paragraphNode, textNode } from '../document/nodes.js'
import { deleteRangeInDoc, getParagraphLength, sliceContentRange, splitContentAt } from '../document/text-utils.js'
import { parse } from '../serializer/parser.js'
import { collapseTo, isCollapsed, normalize } from '../cursor/index.js'

/**
 * @param {DocNode} doc
 * @param {Pos} pos
 * @param {BlockNode[]} blocks
 * @param {EditorRegistries} registries
 * @returns {{ doc: DocNode, selection: EditorSelection }}
 */
function insertBlocksAt(doc, pos, blocks, registries) {
  if (!blocks.length) {
    return { doc, selection: collapseTo(pos) }
  }

  const block = doc.content[pos.block]

  if (!block) {
    return { doc: docNode(blocks), selection: collapseTo({ block: 0, offset: 0 }) }
  }

  if (isVoidBlockNode(block, registries)) {
    const content = [
      ...doc.content.slice(0, pos.block + 1),
      ...blocks,
      paragraphNode([textNode('')]),
      ...doc.content.slice(pos.block + 1),
    ]
    const newBlock = pos.block + 1 + blocks.length
    return { doc: docNode(content), selection: collapseTo({ block: newBlock, offset: 0 }) }
  }

  if (!isTextBlock(block)) {
    return { doc, selection: collapseTo(pos) }
  }

  const [before, after] = splitContentAt(getBlockContent(block), pos.offset, registries)
  const beforeBlock = before.length ? paragraphNode(before) : null
  const afterBlock = after.length ? paragraphNode(after) : paragraphNode([textNode('')])

  const content = [
    ...doc.content.slice(0, pos.block),
    ...(beforeBlock ? [beforeBlock] : []),
    ...blocks,
    afterBlock,
    ...doc.content.slice(pos.block + 1),
  ]

  const newBlock = pos.block + (beforeBlock ? 1 : 0) + blocks.length
  return { doc: docNode(content), selection: collapseTo({ block: newBlock, offset: 0 }) }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {number} blockIndex
 * @returns {EditorState}
 */
export function deleteBlockAt(state, registries, blockIndex) {
  const { doc, selection } = state

  if (blockIndex < 0 || blockIndex >= doc.content.length) {
    return state
  }

  /** @type {BlockNode[]} */
  const content = doc.content.filter((_, index) => index !== blockIndex)

  if (!content.length) {
    content.push(paragraphNode([textNode('')]))
  }

  let cursorBlock = Math.min(blockIndex, content.length - 1)
  let cursorOffset = 0

  if (selection.anchor.block > blockIndex) {
    cursorBlock = selection.anchor.block - 1
    cursorOffset = selection.anchor.offset
  } else if (selection.anchor.block === blockIndex) {
    if (cursorBlock > 0) {
      const prev = content[cursorBlock - 1]
      if (isTextBlock(prev)) {
        cursorBlock -= 1
        cursorOffset = getBlockLength(prev)
      }
    }
  } else {
    cursorBlock = selection.anchor.block
    cursorOffset = selection.anchor.offset
  }

  const target = content[cursorBlock]
  if (isTextBlock(target)) {
    cursorOffset = Math.min(cursorOffset, getBlockLength(target))
  } else {
    cursorOffset = 0
  }

  return {
    ...state,
    doc: docNode(content),
    selection: collapseTo({ block: cursorBlock, offset: cursorOffset }),
  }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {string} blockType
 * @returns {EditorState}
 */
export function insertBlock(state, registries, blockType) {
  if (!registries.blocks.getBlockByType(blockType)) {
    return state
  }

  let { doc, selection } = state
  const { from, to } = normalize(selection)

  if (!isCollapsed(selection)) {
    doc = deleteRangeInDoc(doc, from, to, registries)
  }

  const newBlock = createBlockNode(blockType, registries)
  const result = insertBlocksAt(doc, from, [newBlock], registries)
  return { ...state, doc: result.doc, selection: result.selection }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {BlockNode[]} blocks
 * @returns {EditorState}
 */
export function insertBlocks(state, registries, blocks) {
  let { doc, selection } = state
  const { from, to } = normalize(selection)

  if (!isCollapsed(selection)) {
    doc = deleteRangeInDoc(doc, from, to, registries)
  }

  const result = insertBlocksAt(doc, from, blocks, registries)
  return { ...state, doc: result.doc, selection: result.selection }
}

/**
 * Changes the block type for every text block in the current selection,
 * preserving the inline content. Void blocks and blocks with unknown types
 * are left unchanged.
 *
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {string} blockType
 * @returns {EditorState}
 */
export function setBlockType(state, registries, blockType) {
  const def = registries.blocks.getBlockByType(blockType)
  if (!def || def.void) return state

  const { doc, selection } = state
  const { from, to } = normalize(selection)

  const content = doc.content.map((block, index) => {
    if (index < from.block || index > to.block) return block
    if (!isTextBlock(block)) return block
    return { ...block, type: blockType }
  })

  return { ...state, doc: { ...doc, content } }
}

/**
 * Sets the block type for the current selection. When the selection spans
 * multiple text blocks, merges their content into a single block.
 *
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {string} blockType
 * @returns {EditorState}
 */
export function setBlockTypeForSelection(state, registries, blockType) {
  const def = registries.blocks.getBlockByType(blockType)
  if (!def || def.void) return state

  const { doc, selection } = state
  const { from, to } = normalize(selection)

  if (from.block === to.block) {
    return setBlockType(state, registries, blockType)
  }

  /** @type {import('../document/types.js').TextNode[]} */
  const mergedNodes = []
  let mergedLength = 0

  for (let index = from.block; index <= to.block; index++) {
    const block = doc.content[index]
    if (!isTextBlock(block)) continue

    const content = getBlockContent(block)
    const blockLength = getParagraphLength(content)
    let start = 0
    let end = blockLength

    if (index === from.block) start = from.offset
    if (index === to.block) end = to.offset

    const slice = sliceContentRange(content, start, end, registries)

    if (mergedNodes.length) {
      mergedNodes.push(textNode('\n'))
      mergedLength += 1
    }

    for (const node of slice) {
      mergedNodes.push(node)
      mergedLength += node.text.length
    }
  }

  const mergedBlock = /** @type {import('../document/types.js').TextBlockNode} */ ({
    type: blockType,
    content: mergedNodes.length ? mergedNodes : [textNode('')],
  })

  const nextContent = [
    ...doc.content.slice(0, from.block),
    mergedBlock,
    ...doc.content.slice(to.block + 1),
  ]

  return {
    ...state,
    doc: docNode(nextContent),
    selection: collapseTo({ block: from.block, offset: mergedLength }),
  }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {string} html
 * @returns {EditorState}
 */
export function insertHtml(state, registries, html) {
  const trimmed = html.trim()
  if (!trimmed) return state

  const parsed = parse(trimmed, registries)
  return insertBlocks(state, registries, parsed.content)
}
