/** @typedef {import('./cursor-types.js').Pos} Pos */

import { resolveBlockElementForPos } from './dom-points.js'

/**
 * @param {HTMLElement} surface
 * @param {Pos} pos
 */
export function scrollIntoView(surface, pos) {
  const blockElement = resolveBlockElementForPos(surface, pos)
  if (!blockElement) return

  blockElement.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
