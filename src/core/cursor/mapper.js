/** @typedef {import('./cursor-types.js').Pos} Pos */
/** @typedef {import('./cursor-types.js').EditorSelection} EditorSelection */

import { isCollapsed } from './selection.js'
import { findTextPointInBlock, posFromDomPoint, resolveBlockElementForPos } from './dom-points.js'

/**
 * @param {HTMLElement} surface
 * @returns {EditorSelection | null}
 */
export function readFromDom(surface) {
  const domSelection = window.getSelection()
  if (!domSelection || domSelection.rangeCount === 0) return null

  const anchor = posFromDomPoint(surface, domSelection.anchorNode, domSelection.anchorOffset)
  const focus = posFromDomPoint(surface, domSelection.focusNode, domSelection.focusOffset)

  if (!anchor || !focus) return null

  return { anchor, focus }
}

/**
 * @param {HTMLElement} surface
 * @param {EditorSelection} selection
 */
export function writeToDom(surface, selection) {
  const domSelection = window.getSelection()
  if (!domSelection) return

  const anchorPoint = domPointFromPos(surface, selection.anchor)
  const focusPoint = domPointFromPos(surface, selection.focus)

  if (!anchorPoint || !focusPoint) return

  domSelection.removeAllRanges()

  if (isCollapsed(selection)) {
    domSelection.collapse(anchorPoint.node, anchorPoint.offset)
    return
  }

  if (typeof domSelection.setBaseAndExtent === 'function') {
    domSelection.setBaseAndExtent(
      anchorPoint.node,
      anchorPoint.offset,
      focusPoint.node,
      focusPoint.offset
    )
    return
  }

  domSelection.collapse(anchorPoint.node, anchorPoint.offset)
  domSelection.extend(focusPoint.node, focusPoint.offset)
}

/** @deprecated Use readFromDom */
export const readSelection = readFromDom

/** @deprecated Use writeToDom */
export const writeSelection = writeToDom

/**
 * @param {HTMLElement} surface
 * @param {Pos} pos
 * @returns {{ node: Node, offset: number } | null}
 */
function domPointFromPos(surface, pos) {
  const blockElement = resolveBlockElementForPos(surface, pos)
  if (!blockElement) return null

  return findTextPointInBlock(blockElement, pos.offset)
}
