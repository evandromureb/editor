/** @typedef {import('./cursor-types.js').Pos} Pos */
/** @typedef {import('./cursor-types.js').ContentRange} ContentRange */

import { comparePos } from './pos.js'

/**
 * @param {Pos} from
 * @param {Pos} to
 * @returns {ContentRange}
 */
export function createRange(from, to) {
  if (comparePos(from, to) <= 0) {
    return { from: { ...from }, to: { ...to } }
  }

  return { from: { ...to }, to: { ...from } }
}

/**
 * @param {ContentRange} range
 * @returns {boolean}
 */
export function isEmptyRange(range) {
  return range.from.block === range.to.block && range.from.offset === range.to.offset
}
