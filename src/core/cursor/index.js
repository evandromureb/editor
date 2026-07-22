/**
 * @file Cursor module public API — selection, position, DOM mapping, and hit-testing.
 */

export {
  createSelection,
  isCollapsed,
  normalize,
  collapseTo,
  getDirection,
} from './selection.js'

export { comparePos, isSamePos, minPos, maxPos, posAtBlockStart, posAtBlockEnd, clampPos } from './pos.js'

export { createRange, isEmptyRange } from './range.js'

export { toCursorState, fromCursorState } from './cursor.js'

export { resolvePos, resolveSelection } from './resolve.js'

export { readFromDom, writeToDom, readSelection, writeSelection } from './mapper.js'

export { posFromPoint, nearestPosFromPoint } from './hit-test.js'

export { posFromDomPoint, posFromDomRange, findTextPointInBlock } from './dom-points.js'

export { getCaretRect, getSelectionRect } from './coordinates.js'

export { scrollIntoView } from './scroll.js'
