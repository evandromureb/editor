/** @typedef {import('./cursor-types.js').Pos} Pos */

import {
  getBlockChildren,
  getContainerChildren,
  logicalInlineLength,
  posFromDomRange,
  readChildIndex,
} from './dom-points.js'

/**
 * @param {number} clientX
 * @param {number} clientY
 * @returns {Range | null}
 */
function caretRangeFromPoint(clientX, clientY) {
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(clientX, clientY)
  }

  const caretPositionFromPoint =
    /** @type {Document & {
     *   caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node, offset: number } | null
     * }} */ (document).caretPositionFromPoint

  if (typeof caretPositionFromPoint === 'function') {
    const position = caretPositionFromPoint.call(document, clientX, clientY)
    if (!position) return null

    const range = document.createRange()
    range.setStart(position.offsetNode, position.offset)
    range.collapse(true)
    return range
  }

  return null
}

/**
 * @param {HTMLElement} surface
 * @param {number} clientX
 * @param {number} clientY
 * @returns {Pos | null}
 */
export function posFromPoint(surface, clientX, clientY) {
  if (typeof document.elementFromPoint === 'function') {
    const element = document.elementFromPoint(clientX, clientY)
    if (!element || !surface.contains(element)) {
      return nearestPosFromPoint(surface, clientX, clientY)
    }
  }

  const range = caretRangeFromPoint(clientX, clientY)
  if (range) {
    const pos = posFromDomRange(surface, range)
    if (pos) return pos
  }

  return nearestPosFromPoint(surface, clientX, clientY)
}

/**
 * @param {HTMLElement} surface
 * @param {number} clientX
 * @param {number} clientY
 * @returns {Pos | null}
 */
export function nearestPosFromPoint(surface, clientX, clientY) {
  const blocks = getBlockChildren(surface)
  if (!blocks.length) return null

  /** @type {{ block: HTMLElement, distance: number, offset: number, childIndex: number | null } | null} */
  let nearest = null

  for (const blockElement of blocks) {
    const containerChildren = getContainerChildren(blockElement)
    const candidates = containerChildren.length ? containerChildren : [blockElement]

    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect()
      const textLength = logicalInlineLength(candidate)
      const verticallyInside = clientY >= rect.top && clientY <= rect.bottom
      const distance = verticallyInside
        ? Math.min(Math.abs(clientX - rect.left), Math.abs(clientX - rect.right))
        : Math.hypot(
            clientX - Math.max(rect.left, Math.min(clientX, rect.right)),
            clientY - Math.max(rect.top, Math.min(clientY, rect.bottom))
          )

      let offset = 0
      if (clientX >= rect.right - 1) {
        offset = textLength
      } else if (clientX > rect.left + rect.width / 2) {
        offset = textLength
      }

      if (!nearest || distance < nearest.distance) {
        nearest = {
          block: blockElement,
          distance,
          offset,
          childIndex: containerChildren.length ? readChildIndex(candidate) : null,
        }
      }
    }
  }

  if (!nearest) return null

  const block = Number(nearest.block.dataset.blockIndex)
  if (Number.isNaN(block)) return null

  return nearest.childIndex !== null
    ? { block, childIndex: nearest.childIndex, offset: nearest.offset }
    : { block, offset: nearest.offset }
}
