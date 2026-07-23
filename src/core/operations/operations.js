/** @typedef {import('../document/types.js').DocNode} DocNode */
/** @typedef {import('../selection/types.js').Pos} Pos */
/** @typedef {import('../selection/types.js').EditorSelection} EditorSelection */
/** @typedef {import('./types.js').EditorState} EditorState */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import {
  deleteRangeInDoc,
  deleteRangeInParagraph,
  getMarksAt,
  getMarkAttrsAt,
  insertTextInParagraph,
  mergeParagraphContent,
  splitContentAt,
  updateBlockContent,
} from '../document/text-utils.js'
import {
  getBlockContent,
  getBlockLength,
  getChildBlocks,
  isContainerBlockNode,
  isTextBlock,
  isVoidBlockNode,
} from '../document/block-utils.js'
import { docNode, paragraphNode, textNode } from '../document/nodes.js'
import { collapseTo, isCollapsed, isSamePos, normalize } from '../cursor/index.js'
import { deleteBlockAt } from './blocks.js'
import { getSoftBreakSeparator } from '../document/soft-break.js'

/**
 * Resolves the block a Pos's text operations should target: the root block
 * at `pos.block`, or — when `pos.childIndex` is set — the addressed child
 * inside that container block's `children` array.
 *
 * @param {DocNode} doc
 * @param {Pos} pos
 * @returns {import('../document/types.js').BlockNode | undefined}
 */
function getTargetBlock(doc, pos) {
  const block = doc.content[pos.block]
  if (!block) return undefined
  if (pos.childIndex == null) return block
  return getChildBlocks(block)[pos.childIndex]
}

/**
 * @param {EditorState} state
 * @returns {{ marks: string[], markAttrs: Record<string, string> }}
 */
function resolveInsertMarks(state) {
  if (state.storedMarks?.length) {
    return {
      marks: [...state.storedMarks],
      markAttrs: { ...(state.storedMarkAttrs ?? {}) },
    }
  }

  const { doc, selection } = state
  const block = getTargetBlock(doc, selection.anchor)
  return {
    marks: getMarksAt(getBlockContent(block), selection.anchor.offset),
    markAttrs: getMarkAttrsAt(getBlockContent(block), selection.anchor.offset),
  }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {string} text
 * @returns {EditorState}
 */
export function insertText(state, registries, text) {
  const { doc, selection } = state
  const { from, to } = normalize(selection)
  let nextDoc = isSamePos(from, to) ? doc : deleteRangeInDoc(doc, from, to, registries)
  const { marks, markAttrs } = resolveInsertMarks(state)

  if (!text) {
    return { ...state, doc: nextDoc, selection: collapseTo(from) }
  }

  const lines = text.split('\n')
  let cursor = { ...from }

  if (cursor.childIndex == null) {
    const initialBlock = nextDoc.content[cursor.block]
    if (initialBlock && isVoidBlockNode(initialBlock, registries)) {
      const content = [
        ...nextDoc.content.slice(0, cursor.block + 1),
        paragraphNode([textNode('')]),
        ...nextDoc.content.slice(cursor.block + 1),
      ]
      nextDoc = docNode(content)
      cursor = { block: cursor.block + 1, offset: 0 }
    }
  }

  if (text === '\n') {
    const block = getTargetBlock(nextDoc, cursor)
    if (!block || !isTextBlock(block)) {
      return { ...state, doc: nextDoc, selection: collapseTo(cursor) }
    }

    const content = insertTextInParagraph(
      getBlockContent(block),
      cursor.offset,
      '\n',
      registries,
      marks,
      markAttrs
    )
    nextDoc = updateBlockContent(nextDoc, cursor.block, content, registries, cursor.childIndex)
    return {
      ...state,
      doc: nextDoc,
      selection: collapseTo({ ...cursor, offset: cursor.offset + 1 }),
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const block = getTargetBlock(nextDoc, cursor)

    if (line && block && isTextBlock(block)) {
      const content = insertTextInParagraph(
        getBlockContent(block),
        cursor.offset,
        line,
        registries,
        marks,
        markAttrs
      )
      nextDoc = updateBlockContent(nextDoc, cursor.block, content, registries, cursor.childIndex)
      cursor = { ...cursor, offset: cursor.offset + line.length }
    }

    if (i < lines.length - 1) {
      const currentBlock = getTargetBlock(nextDoc, cursor)
      if (!currentBlock || !isTextBlock(currentBlock)) {
        break
      }
      const currentDef = registries.blocks.getBlockByType(currentBlock.type)
      if (
        cursor.childIndex == null &&
        (currentDef?.softBreakOnEnter || currentDef?.neverSplitOnEnter)
      ) {
        const content = insertTextInParagraph(
          getBlockContent(currentBlock),
          cursor.offset,
          '\n',
          registries,
          marks,
          markAttrs
        )
        nextDoc = updateBlockContent(nextDoc, cursor.block, content, registries)
        cursor = { block: cursor.block, offset: cursor.offset + 1 }
      } else {
        const result = splitParagraphAt(nextDoc, cursor, state, registries)
        nextDoc = result.doc
        cursor =
          cursor.childIndex == null
            ? { block: cursor.block + 1, offset: 0 }
            : { block: cursor.block, childIndex: cursor.childIndex + 1, offset: 0 }
      }
    }
  }

  return { ...state, doc: nextDoc, selection: collapseTo(cursor) }
}

/**
 * Removes one indentation level (a tab, or up to 4 spaces) immediately
 * before the cursor — the mirror image of how plain Tab inserts a tab
 * wherever the cursor happens to be, not only at the start of a line. So
 * Shift+Tab undoes whatever the last Tab there did, regardless of how much
 * other text precedes it on the line. Generalized to any plain text block
 * (paragraph, container child, etc.) so it's a sensible fallback outside of
 * blocks that declare their own `shiftTabCommand`.
 *
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
export function outdentText(state, registries) {
  const { doc, selection } = state
  if (!isCollapsed(selection)) return state

  const pos = selection.anchor
  const block = getTargetBlock(doc, pos)
  if (!block || !isTextBlock(block)) return state

  const text = getBlockContent(block)
    .map((node) => node.text)
    .join('')
  const before = text.slice(0, pos.offset)

  let removeCount = 0
  if (before.endsWith('\t')) {
    removeCount = 1
  } else {
    const match = before.match(/ {1,4}$/)
    if (match) removeCount = match[0].length
  }

  if (removeCount === 0) return state

  const newContent = deleteRangeInParagraph(
    getBlockContent(block),
    pos.offset - removeCount,
    pos.offset,
    registries
  )
  const newPos = { ...pos, offset: pos.offset - removeCount }
  return {
    ...state,
    doc: updateBlockContent(doc, pos.block, newContent, registries, pos.childIndex),
    selection: collapseTo(newPos),
  }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
export function splitParagraph(state, registries) {
  if (!isCollapsed(state.selection)) {
    const deleted = deleteSelection(state, registries)
    return splitParagraphAtState(deleted, registries)
  }

  return splitParagraphAtState(state, registries)
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
export function deleteBackward(state, registries) {
  if (!isCollapsed(state.selection)) {
    return deleteSelection(state, registries)
  }

  const { doc, selection } = state
  const pos = selection.anchor

  if (pos.childIndex != null) {
    return deleteBackwardInChild(state, pos, registries)
  }

  const block = doc.content[pos.block]

  if (isContainerBlockNode(block, registries)) {
    return deleteBlockAt(state, registries, pos.block)
  }

  if (isVoidBlockNode(block, registries)) {
    return deleteBlockAt(state, registries, pos.block)
  }

  if (!isTextBlock(block)) {
    return state
  }

  if (pos.offset > 0) {
    const newContent = deleteRangeInParagraph(
      getBlockContent(block),
      pos.offset - 1,
      pos.offset,
      registries
    )
    const newPos = { block: pos.block, offset: pos.offset - 1 }
    return {
      ...state,
      doc: updateBlockContent(doc, pos.block, newContent, registries),
      selection: collapseTo(newPos),
    }
  }

  if (pos.block === 0) {
    return state
  }

  const prev = doc.content[pos.block - 1]
  if (isVoidBlockNode(prev, registries)) {
    return deleteBlockAt(state, registries, pos.block - 1)
  }

  if (isContainerBlockNode(prev, registries)) {
    return mergeIntoContainerChild(state, pos, registries)
  }

  return mergeWithPrevious(state, pos, registries)
}

/**
 * Backspace at the start of a plain text block that directly follows a
 * container (e.g. the paragraph left behind by `exitEmptyContainerChild`,
 * see below) re-enters the container instead of doing nothing: the block's
 * content is appended to the container's last child and the block itself is
 * removed. Mirrors `exitEmptyContainerChild` in reverse, so Enter-then-
 * Backspace round-trips back to the list for any container-based plugin.
 *
 * @param {EditorState} state
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function mergeIntoContainerChild(state, pos, registries) {
  const { doc } = state
  const container = doc.content[pos.block - 1]
  const curr = doc.content[pos.block]
  const children = getChildBlocks(container)
  const lastChildIndex = children.length - 1
  const lastChild = children[lastChildIndex]

  if (!lastChild || !isTextBlock(lastChild) || !isTextBlock(curr)) {
    return state
  }

  const lastChildLength = getBlockLength(lastChild)
  const merged = mergeParagraphContent(
    getBlockContent(lastChild),
    getBlockContent(curr),
    registries
  )

  const nextChildren = [...children.slice(0, lastChildIndex), { ...lastChild, content: merged }]

  const content = [
    ...doc.content.slice(0, pos.block - 1),
    { ...container, children: nextChildren },
    ...doc.content.slice(pos.block + 1),
  ]

  const newPos = { block: pos.block - 1, childIndex: lastChildIndex, offset: lastChildLength }
  return { ...state, doc: { type: 'doc', content }, selection: collapseTo(newPos) }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
export function deleteForward(state, registries) {
  if (!isCollapsed(state.selection)) {
    return deleteSelection(state, registries)
  }

  const { doc, selection } = state
  const pos = selection.anchor

  if (pos.childIndex != null) {
    return deleteForwardInChild(state, pos, registries)
  }

  const block = doc.content[pos.block]

  if (isContainerBlockNode(block, registries)) {
    return deleteBlockAt(state, registries, pos.block)
  }

  if (isVoidBlockNode(block, registries)) {
    return deleteBlockAt(state, registries, pos.block)
  }

  if (!isTextBlock(block)) {
    return state
  }

  const length = getBlockLength(block)

  if (pos.offset < length) {
    const newContent = deleteRangeInParagraph(
      getBlockContent(block),
      pos.offset,
      pos.offset + 1,
      registries
    )
    return {
      ...state,
      doc: updateBlockContent(doc, pos.block, newContent, registries),
      selection: collapseTo(pos),
    }
  }

  if (pos.block >= doc.content.length - 1) {
    return state
  }

  const next = doc.content[pos.block + 1]
  if (isVoidBlockNode(next, registries)) {
    return deleteBlockAt(state, registries, pos.block + 1)
  }

  return mergeWithNext(state, pos, registries)
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function deleteSelection(state, registries) {
  const { from, to } = normalize(state.selection)
  return {
    ...state,
    doc: deleteRangeInDoc(state.doc, from, to, registries),
    selection: collapseTo(from),
  }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function splitParagraphAtState(state, registries) {
  return splitParagraphAt(state.doc, state.selection.anchor, state, registries)
}

/**
 * @param {DocNode} doc
 * @param {Pos} pos
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function splitParagraphAt(doc, pos, state, registries) {
  if (pos.childIndex != null) {
    return splitContainerChildAt(doc, pos, state, registries)
  }

  const block = doc.content[pos.block]

  if (!isTextBlock(block)) {
    return state
  }

  const def = registries.blocks.getBlockByType(block.type)

  if (def?.neverSplitOnEnter) {
    const { marks, markAttrs } = resolveInsertMarks(state)
    const content = insertTextInParagraph(
      getBlockContent(block),
      pos.offset,
      '\n',
      registries,
      marks,
      markAttrs
    )
    return {
      ...state,
      doc: updateBlockContent(doc, pos.block, content, registries),
      selection: collapseTo({ block: pos.block, offset: pos.offset + 1 }),
    }
  }

  if (def?.softBreakOnEnter) {
    const separator = getSoftBreakSeparator(def)
    const content = getBlockContent(block)
    const [beforeNodes, afterNodes] = splitContentAt(content, pos.offset, registries)
    const beforeText = beforeNodes.map((node) => node.text).join('')
    const afterText = afterNodes.map((node) => node.text).join('')

    const currentParagraphEmpty =
      beforeText.endsWith(separator) && (afterText === '' || afterText.startsWith(separator))

    if (currentParagraphEmpty) {
      const [quoteNodes] = splitContentAt(content, pos.offset - 1, registries)
      const quoteContent = quoteNodes.length ? quoteNodes : [textNode('')]
      const hasQuoteText = quoteNodes.some((node) => node.text.length > 0)

      /** @type {import('../document/types.js').BlockNode[]} */
      const nextContent = [
        ...doc.content.slice(0, pos.block),
        ...(hasQuoteText ? [{ ...block, content: quoteContent }] : []),
        paragraphNode([textNode('')]),
        ...doc.content.slice(pos.block + 1),
      ]

      const newBlock = hasQuoteText ? pos.block + 1 : pos.block
      return {
        ...state,
        doc: docNode(nextContent),
        selection: collapseTo({ block: newBlock, offset: 0 }),
      }
    }

    const { marks, markAttrs } = resolveInsertMarks(state)
    const newContent = insertTextInParagraph(
      content,
      pos.offset,
      separator,
      registries,
      marks,
      markAttrs
    )
    return {
      ...state,
      doc: updateBlockContent(doc, pos.block, newContent, registries),
      selection: collapseTo({ block: pos.block, offset: pos.offset + 1 }),
    }
  }

  const preserveType = def?.preserveTypeOnSplit === true
  const exitOnEmpty = def?.exitOnEmptyEnter === true

  if (preserveType && exitOnEmpty && getBlockLength(block) === 0) {
    const prev = doc.content[pos.block - 1]
    if (prev && isTextBlock(prev) && prev.type === block.type) {
      const content = [
        ...doc.content.slice(0, pos.block),
        paragraphNode([textNode('')]),
        ...doc.content.slice(pos.block + 1),
      ]
      return {
        ...state,
        doc: docNode(content),
        selection: collapseTo({ block: pos.block, offset: 0 }),
      }
    }
  }

  const [before, after] = splitContentAt(getBlockContent(block), pos.offset, registries)
  const afterType = preserveType ? block.type : 'paragraph'

  const style = /** @type {any} */ (block).style

  const content = [
    ...doc.content.slice(0, pos.block),
    { ...block, content: before.length ? before : [textNode('')] },
    {
      type: afterType,
      content: after.length ? after : [textNode('')],
      ...(style ? { style } : {}),
    },
    ...doc.content.slice(pos.block + 1),
  ]

  const newPos = { block: pos.block + 1, offset: 0 }
  return { ...state, doc: { type: 'doc', content }, selection: collapseTo(newPos) }
}

/**
 * @param {EditorState} state
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function mergeWithPrevious(state, pos, registries) {
  const { doc } = state
  const prev = doc.content[pos.block - 1]
  const curr = doc.content[pos.block]

  if (!isTextBlock(prev) || !isTextBlock(curr)) {
    return state
  }

  const merged = mergeParagraphContent(getBlockContent(prev), getBlockContent(curr), registries)
  const prevLength = getBlockLength(prev)

  const content = [
    ...doc.content.slice(0, pos.block - 1),
    { ...prev, content: merged },
    ...doc.content.slice(pos.block + 1),
  ]

  const newPos = { block: pos.block - 1, offset: prevLength }
  return { ...state, doc: { type: 'doc', content }, selection: collapseTo(newPos) }
}

/**
 * @param {EditorState} state
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function mergeWithNext(state, pos, registries) {
  const { doc } = state
  const curr = doc.content[pos.block]
  const next = doc.content[pos.block + 1]

  if (!isTextBlock(curr) || !isTextBlock(next)) {
    return state
  }

  const merged = mergeParagraphContent(getBlockContent(curr), getBlockContent(next), registries)

  const content = [
    ...doc.content.slice(0, pos.block),
    { ...curr, content: merged },
    ...doc.content.slice(pos.block + 2),
  ]

  return { ...state, doc: { type: 'doc', content }, selection: collapseTo(pos) }
}

/**
 * Splits the container child addressed by `pos` in two, exactly mirroring
 * the root-level split at the bottom of `splitParagraphAt` but scoped to the
 * container's `children` array. Children always keep their own type (a
 * task-item split by Enter stays a task-item — there is no "exit to
 * paragraph via Enter", only via Backspace on an empty item, see
 * `removeContainerChild`), and a fresh second half never inherits `attrs`
 * (e.g. a split task-item's checked state) — it gets the child type's own
 * declared `attrDefaults` instead, matching "Enter always creates a fresh,
 * unchecked item".
 *
 * @param {DocNode} doc
 * @param {Pos} pos
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function splitContainerChildAt(doc, pos, state, registries) {
  const container = doc.content[pos.block]
  const children = getChildBlocks(container)
  const child = children[pos.childIndex]

  if (!child || !isTextBlock(child)) return state

  // Enter on an empty item exits the container instead of creating another
  // empty sibling (matches Notion/GitHub/TipTap/Google Docs: pressing Enter
  // a second time on a blank checklist item drops back to a plain paragraph).
  if (getBlockLength(child) === 0) {
    return exitEmptyContainerChild(doc, pos, state)
  }

  const [before, after] = splitContentAt(getBlockContent(child), pos.offset, registries)
  const style = /** @type {any} */ (child).style
  const attrDefaults = registries.blocks.getBlockByType(child.type)?.attrDefaults

  const beforeChild = { ...child, content: before.length ? before : [textNode('')] }
  const afterChild = {
    type: child.type,
    content: after.length ? after : [textNode('')],
    ...(style ? { style } : {}),
    ...(attrDefaults ? { attrs: { ...attrDefaults } } : {}),
  }

  const nextChildren = [
    ...children.slice(0, pos.childIndex),
    beforeChild,
    afterChild,
    ...children.slice(pos.childIndex + 1),
  ]

  const content = doc.content.map((b, i) =>
    i === pos.block ? { ...container, children: nextChildren } : b
  )
  const newPos = { block: pos.block, childIndex: pos.childIndex + 1, offset: 0 }
  return { ...state, doc: { type: 'doc', content }, selection: collapseTo(newPos) }
}

/**
 * Pressing Enter on an empty container child (e.g. a blank checklist item)
 * exits the container instead of adding another empty sibling: the item is
 * pulled out into a plain paragraph, splitting the container in two around
 * it when it wasn't the first/last child. Mirrors the flat-block
 * `exitOnEmptyEnter` behavior (see `splitParagraphAt` above), generalized to
 * containers so any future list-like plugin gets the same UX for free.
 *
 * @param {DocNode} doc
 * @param {Pos} pos
 * @param {EditorState} state
 * @returns {EditorState}
 */
function exitEmptyContainerChild(doc, pos, state) {
  const container = doc.content[pos.block]
  const children = getChildBlocks(container)

  const before = children.slice(0, pos.childIndex)
  const after = children.slice(pos.childIndex + 1)

  /** @type {import('../document/types.js').BlockNode[]} */
  const replacement = []
  if (before.length) replacement.push({ ...container, children: before })
  replacement.push(paragraphNode([textNode('')]))
  if (after.length) replacement.push({ ...container, children: after })

  const content = [
    ...doc.content.slice(0, pos.block),
    ...replacement,
    ...doc.content.slice(pos.block + 1),
  ]

  const paragraphIndex = pos.block + (before.length ? 1 : 0)
  return {
    ...state,
    doc: { type: 'doc', content },
    selection: collapseTo({ block: paragraphIndex, offset: 0 }),
  }
}

/**
 * @param {EditorState} state
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function deleteBackwardInChild(state, pos, registries) {
  const { doc } = state
  const container = doc.content[pos.block]
  const children = getChildBlocks(container)
  const child = children[pos.childIndex]

  if (!child || !isTextBlock(child)) return state

  if (pos.offset > 0) {
    const newContent = deleteRangeInParagraph(
      getBlockContent(child),
      pos.offset - 1,
      pos.offset,
      registries
    )
    return {
      ...state,
      doc: updateBlockContent(doc, pos.block, newContent, registries, pos.childIndex),
      selection: collapseTo({ ...pos, offset: pos.offset - 1 }),
    }
  }

  if (getBlockLength(child) === 0) {
    return removeContainerChild(state, pos, registries)
  }

  return mergeContainerChildWithPrevious(state, pos, registries)
}

/**
 * @param {EditorState} state
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function deleteForwardInChild(state, pos, registries) {
  const { doc } = state
  const container = doc.content[pos.block]
  const children = getChildBlocks(container)
  const child = children[pos.childIndex]

  if (!child || !isTextBlock(child)) return state

  const length = getBlockLength(child)

  if (pos.offset < length) {
    const newContent = deleteRangeInParagraph(
      getBlockContent(child),
      pos.offset,
      pos.offset + 1,
      registries
    )
    return {
      ...state,
      doc: updateBlockContent(doc, pos.block, newContent, registries, pos.childIndex),
      selection: collapseTo(pos),
    }
  }

  return mergeContainerChildWithNext(state, pos, registries)
}

/**
 * Removes the empty child addressed by `pos` from its container. Collapses
 * the whole container back to an empty paragraph when it was the last
 * remaining child (matching a bullet/numbered list editor's usual "empty
 * last item + Backspace exits the list" behavior).
 *
 * @param {EditorState} state
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function removeContainerChild(state, pos, registries) {
  const { doc } = state
  const container = doc.content[pos.block]
  const children = getChildBlocks(container)
  const nextChildren = children.filter((_, i) => i !== pos.childIndex)

  if (!nextChildren.length) {
    const content = doc.content.map((b, i) => (i === pos.block ? paragraphNode([textNode('')]) : b))
    return {
      ...state,
      doc: { type: 'doc', content },
      selection: collapseTo({ block: pos.block, offset: 0 }),
    }
  }

  const content = doc.content.map((b, i) =>
    i === pos.block ? { ...container, children: nextChildren } : b
  )

  const newChildIndex = pos.childIndex > 0 ? pos.childIndex - 1 : 0
  const newOffset = pos.childIndex > 0 ? getBlockLength(nextChildren[newChildIndex]) : 0

  return {
    ...state,
    doc: { type: 'doc', content },
    selection: collapseTo({ block: pos.block, childIndex: newChildIndex, offset: newOffset }),
  }
}

/**
 * @param {EditorState} state
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function mergeContainerChildWithPrevious(state, pos, registries) {
  const { doc } = state
  const container = doc.content[pos.block]
  const children = getChildBlocks(container)

  if (pos.childIndex === 0) return state

  const prev = children[pos.childIndex - 1]
  const curr = children[pos.childIndex]
  if (!isTextBlock(prev) || !isTextBlock(curr)) return state

  const merged = mergeParagraphContent(getBlockContent(prev), getBlockContent(curr), registries)
  const prevLength = getBlockLength(prev)

  const nextChildren = [
    ...children.slice(0, pos.childIndex - 1),
    { ...prev, content: merged },
    ...children.slice(pos.childIndex + 1),
  ]

  const content = doc.content.map((b, i) =>
    i === pos.block ? { ...container, children: nextChildren } : b
  )
  const newPos = { block: pos.block, childIndex: pos.childIndex - 1, offset: prevLength }
  return { ...state, doc: { type: 'doc', content }, selection: collapseTo(newPos) }
}

/**
 * @param {EditorState} state
 * @param {Pos} pos
 * @param {EditorRegistries} registries
 * @returns {EditorState}
 */
function mergeContainerChildWithNext(state, pos, registries) {
  const { doc } = state
  const container = doc.content[pos.block]
  const children = getChildBlocks(container)

  if (pos.childIndex >= children.length - 1) return state

  const curr = children[pos.childIndex]
  const next = children[pos.childIndex + 1]
  if (!isTextBlock(curr) || !isTextBlock(next)) return state

  const merged = mergeParagraphContent(getBlockContent(curr), getBlockContent(next), registries)

  const nextChildren = [
    ...children.slice(0, pos.childIndex),
    { ...curr, content: merged },
    ...children.slice(pos.childIndex + 2),
  ]

  const content = doc.content.map((b, i) =>
    i === pos.block ? { ...container, children: nextChildren } : b
  )
  return { ...state, doc: { type: 'doc', content }, selection: collapseTo(pos) }
}
