/** @typedef {import('./cursor-types.js').Pos} Pos */

/**
 * Compares positions as a `(block, childIndex, offset)` tuple. `childIndex`
 * absent (an ordinary block, or the container's own position) sorts before
 * any set `childIndex` at the same `block` — this only matters when both
 * positions share the same `block`, which happens constantly for two
 * positions inside the same container (e.g. two task-items in one task-list).
 *
 * @param {Pos} a
 * @param {Pos} b
 * @returns {number} negative if a < b, zero if equal, positive if a > b
 */
export function comparePos(a, b) {
  if (a.block !== b.block) return a.block - b.block

  const aChild = a.childIndex ?? -1
  const bChild = b.childIndex ?? -1
  if (aChild !== bChild) return aChild - bChild

  return a.offset - b.offset
}

/**
 * @param {Pos} a
 * @param {Pos} b
 * @returns {boolean}
 */
export function isSamePos(a, b) {
  return comparePos(a, b) === 0
}

/**
 * @param {Pos} a
 * @param {Pos} b
 * @returns {Pos}
 */
export function minPos(a, b) {
  return comparePos(a, b) <= 0 ? { ...a } : { ...b }
}

/**
 * @param {Pos} a
 * @param {Pos} b
 * @returns {Pos}
 */
export function maxPos(a, b) {
  return comparePos(a, b) >= 0 ? { ...a } : { ...b }
}

/**
 * @param {number} block
 * @returns {Pos}
 */
export function posAtBlockStart(block) {
  return { block, offset: 0 }
}

/**
 * @param {number} block
 * @param {number} length
 * @returns {Pos}
 */
export function posAtBlockEnd(block, length) {
  return { block, offset: length }
}

/**
 * @param {Pos} pos
 * @param {number} block
 * @param {number} maxOffset
 * @returns {Pos}
 */
export function clampPos(pos, block, maxOffset) {
  return {
    block: Math.max(0, Math.min(block, pos.block)),
    offset: Math.max(0, Math.min(maxOffset, pos.offset)),
  }
}
