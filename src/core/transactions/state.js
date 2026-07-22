/** @typedef {import('../operations/types.js').EditorState} EditorState */

import { cloneDoc } from '../document/nodes.js'

/**
 * @param {EditorState} state
 * @returns {EditorState}
 */
export function cloneState(state) {
  return {
    doc: cloneDoc(state.doc),
    selection: {
      anchor: { ...state.selection.anchor },
      focus: { ...state.selection.focus },
    },
    storedMarks: state.storedMarks?.length ? [...state.storedMarks] : [],
    storedMarkAttrs: state.storedMarkAttrs ? { ...state.storedMarkAttrs } : undefined,
  }
}

/**
 * @param {EditorState} a
 * @param {EditorState} b
 * @returns {boolean}
 */
export function statesEqual(a, b) {
  const marksA = a.storedMarks ?? []
  const marksB = b.storedMarks ?? []
  const attrsA = a.storedMarkAttrs ?? {}
  const attrsB = b.storedMarkAttrs ?? {}

  return (
    JSON.stringify(a.doc) === JSON.stringify(b.doc) &&
    a.selection.anchor.block === b.selection.anchor.block &&
    a.selection.anchor.offset === b.selection.anchor.offset &&
    a.selection.focus.block === b.selection.focus.block &&
    a.selection.focus.offset === b.selection.focus.offset &&
    JSON.stringify(marksA) === JSON.stringify(marksB) &&
    JSON.stringify(attrsA) === JSON.stringify(attrsB)
  )
}
