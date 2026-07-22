/** @typedef {import('./cursor-types.js').Pos} Pos */

import { findTextPointInBlock, resolveBlockElementForPos } from './dom-points.js'

/**
 * @param {HTMLElement} surface
 * @param {Pos} pos
 * @returns {DOMRect | null}
 */
export function getCaretRect(surface, pos) {
  const blockElement = resolveBlockElementForPos(surface, pos)
  if (!blockElement) return null

  const range = document.createRange()
  const point = findTextPointInBlock(blockElement, pos.offset)
  range.setStart(point.node, point.offset)
  range.collapse(true)

  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return blockElement.getBoundingClientRect()
  }

  return rect
}

/**
 * @param {HTMLElement} surface
 * @param {Pos} from
 * @param {Pos} to
 * @returns {DOMRect | null}
 */
export function getSelectionRect(surface, from, to) {
  const blockElement = resolveBlockElementForPos(surface, from)
  if (!blockElement) return null

  const range = document.createRange()
  const startPoint = findTextPointInBlock(blockElement, from.offset)
  range.setStart(startPoint.node, startPoint.offset)

  const endBlock = resolveBlockElementForPos(surface, to)
  if (!endBlock) return null

  const endPoint = findTextPointInBlock(endBlock, to.offset)
  range.setEnd(endPoint.node, endPoint.offset)

  return range.getBoundingClientRect()
}
