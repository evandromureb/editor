import { cloneState } from './state.js'

/** @typedef {import('../operations/types.js').EditorState} EditorState */

/**
 * @typedef {object} Transaction
 * @property {EditorState} before
 * @property {EditorState} after
 */

/**
 * @param {EditorState} before
 * @param {EditorState} after
 * @returns {Transaction}
 */
export function createTransaction(before, after) {
  return {
    before: cloneState(before),
    after: cloneState(after),
  }
}
