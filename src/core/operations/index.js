/**
 * @file Document operations public API — blocks, formatting, and selection.
 */

export {
  insertText,
  outdentText,
  splitParagraph,
  deleteBackward,
  deleteForward,
} from './operations.js'

export { insertBlock, insertBlocks, insertHtml, deleteBlockAt } from './blocks.js'

export { toggleMark } from './formatting.js'

export { setSelection } from './selection.js'
