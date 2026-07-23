/** @typedef {import('./cursor-types.js').EditorSelection} EditorSelection */
/** @typedef {import('./cursor-types.js').CursorState} CursorState */

import { getDirection, isCollapsed } from './selection.js'

/**
 * @param {EditorSelection} selection
 * @returns {CursorState}
 */
export function toCursorState(selection) {
  const collapsed = isCollapsed(selection)

  return {
    anchor: { ...selection.anchor },
    focus: { ...selection.focus },
    direction: getDirection(selection),
    isCollapsed: collapsed,
    blockId: selection.focus.block,
    offset: selection.focus.offset,
  }
}

/**
 * @param {CursorState} state
 * @returns {EditorSelection}
 */
export function fromCursorState(state) {
  return {
    anchor: { ...state.anchor },
    focus: { ...state.focus },
  }
}
