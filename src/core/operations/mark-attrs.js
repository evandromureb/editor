/** @typedef {import('./types.js').EditorState} EditorState */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { addMark, removeMark, removeMarkAttr } from '../document/marks.js'
import { getBlockLength, getChildBlocks, isTextBlock } from '../document/block-utils.js'
import {
  setMarkAttrInRange,
  clearMarkAttrInRange,
  sliceContentRange,
  getMarkAttrsAt,
  getTargetBlock,
  mapContainerChildrenRange,
} from '../document/text-utils.js'
import { normalize } from '../cursor/index.js'

/**
 * @param {import('../document/types.js').DocNode} doc
 * @param {import('../selection/types.js').Pos} from
 * @param {import('../selection/types.js').Pos} to
 * @param {string} markName
 * @param {string} value
 * @param {EditorRegistries} registries
 */
function setMarkAttrInDoc(doc, from, to, markName, value, registries) {
  if (from.block === to.block && from.childIndex != null) {
    const toChildIndex = to.childIndex ?? from.childIndex
    return mapContainerChildrenRange(
      doc,
      from.block,
      from.childIndex,
      toChildIndex,
      from.offset,
      to.offset,
      (content, start, end) => setMarkAttrInRange(content, start, end, markName, value, registries)
    )
  }

  return {
    type: 'doc',
    content: doc.content.map((block, index) => {
      if (index < from.block || index > to.block) return block
      if (!isTextBlock(block)) return block

      const start = index === from.block ? from.offset : 0
      const end = index === to.block ? to.offset : getBlockLength(block)

      if (start >= end) return block

      return {
        ...block,
        content: setMarkAttrInRange(block.content, start, end, markName, value, registries),
      }
    }),
  }
}

/**
 * @param {import('../document/types.js').DocNode} doc
 * @param {import('../selection/types.js').Pos} from
 * @param {import('../selection/types.js').Pos} to
 * @param {string} markName
 * @param {EditorRegistries} registries
 */
function clearMarkAttrInDoc(doc, from, to, markName, registries) {
  if (from.block === to.block && from.childIndex != null) {
    const toChildIndex = to.childIndex ?? from.childIndex
    return mapContainerChildrenRange(
      doc,
      from.block,
      from.childIndex,
      toChildIndex,
      from.offset,
      to.offset,
      (content, start, end) => clearMarkAttrInRange(content, start, end, markName, registries)
    )
  }

  return {
    type: 'doc',
    content: doc.content.map((block, index) => {
      if (index < from.block || index > to.block) return block
      if (!isTextBlock(block)) return block

      const start = index === from.block ? from.offset : 0
      const end = index === to.block ? to.offset : getBlockLength(block)

      if (start >= end) return block

      return {
        ...block,
        content: clearMarkAttrInRange(block.content, start, end, markName, registries),
      }
    }),
  }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {string} markName
 * @param {string} value
 * @returns {EditorState}
 */
export function setMarkAttr(state, registries, markName, value) {
  if (!value) {
    return clearMarkAttr(state, registries, markName)
  }

  const { selection } = state
  const collapsed =
    selection.anchor.block === selection.focus.block &&
    selection.anchor.offset === selection.focus.offset

  if (collapsed) {
    const storedMarks = addMark(state.storedMarks ?? [], markName, registries)
    const storedMarkAttrs = { ...(state.storedMarkAttrs ?? {}), [markName]: value }

    return {
      ...state,
      storedMarks: registries.marks.sortMarks(storedMarks),
      storedMarkAttrs,
    }
  }

  const { from, to } = normalize(selection)

  return {
    ...state,
    doc: setMarkAttrInDoc(state.doc, from, to, markName, value, registries),
  }
}

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {string} markName
 * @returns {EditorState}
 */
export function clearMarkAttr(state, registries, markName) {
  const { selection } = state
  const collapsed =
    selection.anchor.block === selection.focus.block &&
    selection.anchor.offset === selection.focus.offset

  if (collapsed) {
    const storedMarks = removeMark(state.storedMarks ?? [], markName, registries)
    const storedMarkAttrs = removeMarkAttr(state.storedMarkAttrs ?? {}, markName)

    return {
      ...state,
      storedMarks: registries.marks.sortMarks(storedMarks),
      storedMarkAttrs: Object.keys(storedMarkAttrs).length ? storedMarkAttrs : undefined,
    }
  }

  const { from, to } = normalize(selection)

  return {
    ...state,
    doc: clearMarkAttrInDoc(state.doc, from, to, markName, registries),
  }
}

/**
 * @param {import('../document/types.js').DocNode} doc
 * @param {import('../selection/types.js').EditorSelection} selection
 * @param {string} markName
 * @param {EditorRegistries} registries
 * @returns {string | 'mixed' | null}
 */
export function getMarkAttrInSelection(doc, selection, markName, registries) {
  const { from, to } = normalize(selection)
  const collapsed = from.block === to.block && from.offset === to.offset

  if (from.block === to.block && from.childIndex != null) {
    if (collapsed) {
      const block = getTargetBlock(doc, from)
      if (!isTextBlock(block)) return null
      return getMarkAttrsAt(block.content, from.offset)[markName] ?? null
    }

    const toChildIndex = to.childIndex ?? from.childIndex
    const children = getChildBlocks(doc.content[from.block])
    /** @type {Set<string>} */
    const childValues = new Set()

    for (let childIndex = from.childIndex; childIndex <= toChildIndex; childIndex++) {
      const child = children[childIndex]
      if (!isTextBlock(child)) continue

      const start = childIndex === from.childIndex ? from.offset : 0
      const end = childIndex === toChildIndex ? to.offset : getBlockLength(child)
      if (start >= end) continue

      const slice = sliceContentRange(child.content, start, end, registries)
      for (const node of slice) {
        if (node.marks?.includes(markName) && node.markAttrs?.[markName]) {
          childValues.add(node.markAttrs[markName])
        }
      }
    }

    if (childValues.size === 0) return null
    if (childValues.size === 1) return [...childValues][0]
    return 'mixed'
  }

  /** @type {Set<string>} */
  const values = new Set()

  for (let blockIndex = from.block; blockIndex <= to.block; blockIndex++) {
    const block = doc.content[blockIndex]
    if (!isTextBlock(block)) continue

    const start = blockIndex === from.block ? from.offset : 0
    const end = blockIndex === to.block ? to.offset : getBlockLength(block)

    if (collapsed) {
      const attrs = getMarkAttrsAt(block.content, start)
      const value = attrs[markName]
      return value ?? null
    }

    if (start >= end) continue

    const slice = sliceContentRange(block.content, start, end, registries)
    for (const node of slice) {
      if (node.marks?.includes(markName) && node.markAttrs?.[markName]) {
        values.add(node.markAttrs[markName])
      }
    }
  }

  if (values.size === 0) return null
  if (values.size === 1) return [...values][0]
  return 'mixed'
}
