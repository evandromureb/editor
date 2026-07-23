/**
 * Plugin SDK — public contract between the editor and plugins.
 *
 * Plugins import ONLY from this module (resolved as @baselab/plugin-sdk alias).
 * No imports from src/core/, src/ui/ or internal paths are allowed.
 */

export { definePlugin } from './define-plugin.js'
export { defineTheme } from './define-theme.js'

export {
  mark,
  block,
  command,
  toolbarItem,
  shortcut,
  theme,
  toolbarSeparator,
  statusbarItem,
  sidebarPanel,
  contextMenuItem,
  contextMenu,
  selectionMenu,
  inspectorPanel,
  overlay,
} from './helpers.js'

// Public types (JSDoc reference)
export {} from './types.js'

// Pure operations for command handlers (state → state)
export { toggleMark } from '../core/operations/formatting.js'
export { setMarkAttr, clearMarkAttr } from '../core/operations/mark-attrs.js'
export { insertText } from '../core/operations/operations.js'
export {
  insertBlock,
  insertBlocks,
  setBlockType,
  deleteBlockAt,
} from '../core/operations/blocks.js'

// Shortcut utilities
export { parseShortcut, matchesShortcut, formatShortcut } from '../core/shortcuts/index.js'
