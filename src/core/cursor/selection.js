/** @typedef {import('./cursor-types.js').Pos} Pos */
/** @typedef {import('./cursor-types.js').EditorSelection} EditorSelection */
/** @typedef {import('./cursor-types.js').SelectionDirection} SelectionDirection */
/** @typedef {import('./cursor-types.js').ContentRange} ContentRange */

import { comparePos } from './pos.js'

/**
 * @param {number} [block]
 * @param {number} [offset]
 * @returns {EditorSelection}
 */
export function createSelection(block = 0, offset = 0) {
  const pos = { block, offset }
  return { anchor: { ...pos }, focus: { ...pos } }
}

/**
 * @param {EditorSelection} selection
 * @returns {boolean}
 */
export function isCollapsed(selection) {
  return comparePos(selection.anchor, selection.focus) === 0
}

/**
 * @param {EditorSelection} selection
 * @returns {ContentRange}
 */
export function normalize(selection) {
  const a = selection.anchor
  const b = selection.focus

  if (comparePos(a, b) <= 0) {
    return { from: { ...a }, to: { ...b } }
  }

  return { from: { ...b }, to: { ...a } }
}

/**
 * @param {EditorSelection} selection
 * @returns {SelectionDirection}
 */
export function getDirection(selection) {
  if (isCollapsed(selection)) return 'none'

  return comparePos(selection.anchor, selection.focus) <= 0 ? 'forward' : 'backward'
}

/**
 * @param {Pos} pos
 * @returns {EditorSelection}
 */
export function collapseTo(pos) {
  return { anchor: { ...pos }, focus: { ...pos } }
}
