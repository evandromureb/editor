/**
 * @typedef {object} Pos
 * @property {number} block  Block index in the document
 * @property {number} offset  Character offset within the paragraph (or within the addressed child, when `childIndex` is set)
 * @property {number} [childIndex]  Index into the container block's `children` array at `block`. Absent for ordinary (non-container) blocks — one level of nesting only.
 */

/**
 * @typedef {object} EditorSelection
 * @property {Pos} anchor
 * @property {Pos} focus
 */

/**
 * @typedef {'forward' | 'backward' | 'none'} SelectionDirection
 */

/**
 * @typedef {object} CursorState
 * @property {Pos} anchor
 * @property {Pos} focus
 * @property {SelectionDirection} direction
 * @property {boolean} isCollapsed
 * @property {number} blockId
 * @property {number} offset
 */

/**
 * @typedef {object} ContentRange
 * @property {Pos} from
 * @property {Pos} to
 */

export {}
