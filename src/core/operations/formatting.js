/** @typedef {import('./types.js').EditorState} EditorState */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { addMark, removeMark } from '../document/marks.js'
import { toggleMarkInDoc } from '../document/text-utils.js'

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {string} mark
 * @returns {EditorState}
 */
export function toggleMark(state, registries, mark) {
  const { doc, selection } = state
  const a = selection.anchor
  const b = selection.focus
  const collapsed = a.block === b.block && a.offset === b.offset

  if (collapsed) {
    const stored = state.storedMarks ?? []
    const hasMark = stored.includes(mark)
    const storedMarks = hasMark
      ? removeMark(stored, mark, registries)
      : addMark(stored, mark, registries)

    return {
      ...state,
      storedMarks: registries.marks.sortMarks(storedMarks),
    }
  }

  const from =
    a.block < b.block || (a.block === b.block && a.offset <= b.offset)
      ? { ...a }
      : { ...b }
  const to =
    a.block < b.block || (a.block === b.block && a.offset <= b.offset)
      ? { ...b }
      : { ...a }

  return {
    ...state,
    doc: toggleMarkInDoc(doc, from, to, mark, registries),
    storedMarks: state.storedMarks ?? [],
  }
}
