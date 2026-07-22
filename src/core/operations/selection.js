/** @typedef {import('./types.js').EditorState} EditorState */
/** @typedef {import('../selection/types.js').EditorSelection} EditorSelection */
/** @typedef {import('../schema/editor-registries.js').EditorRegistries} EditorRegistries */

import { resolveSelection } from '../cursor/index.js'

/**
 * @param {EditorState} state
 * @param {EditorRegistries} registries
 * @param {EditorSelection} selection
 * @returns {EditorState}
 */
export function setSelection(state, registries, selection) {
  const resolved = resolveSelection(state.doc, selection, registries)
  return {
    ...state,
    selection: {
      anchor: { ...resolved.anchor },
      focus: { ...resolved.focus },
    },
  }
}
