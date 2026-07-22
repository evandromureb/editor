/**
 * @file Public package entry — re-exports editor, core, SDK, and UI APIs.
 */

import { PresetRegistry } from './core/presets/index.js'

export { Editor } from './editor.js'
export { createDocument, Document } from './core/document/index.js'
export { serialize, parse } from './core/serializer/index.js'
export { createSelection, readSelection, writeSelection } from './core/cursor/index.js'
export {
  createCommandRegistry,
  createMarkRegistry,
  createBlockRegistry,
  createEditorRegistries,
  EditorRegistries,
} from './core/schema/index.js'
export { PluginRuntime } from './core/plugins/runtime.js'
export { I18n } from './core/i18n/index.js'
export { sanitizeHtml, extractPasteText } from './core/sanitize/index.js'
export { THEMES, getTheme as getThemeDefinition } from './ui/themes/index.js'
export { APPEARANCES, normalizeAppearance } from './ui/appearance/index.js'
export { createEditor, defineEditor, WysiwygEditorElement } from './embed/index.js'
export { PresetRegistry } from './core/presets/index.js'
export { resolveEditorConfig } from './core/presets/resolve-config.js'
export { Select, createCustomSelect } from './ui/select/index.js'

// SDK for plugins and themes — the only surface that plugins should import
export {
  definePlugin,
  defineTheme,
  mark,
  block,
  command,
  toolbarItem,
  shortcut,
  theme,
  toggleMark,
  insertText,
  insertBlock,
  parseShortcut,
  matchesShortcut,
  formatShortcut,
  statusbarItem,
  sidebarPanel,
  contextMenu,
  selectionMenu,
  inspectorPanel,
  overlay,
  toolbarSeparator,
} from './sdk/index.js'

// Design System — for plugins via ctx.ui or standalone use
export { createButton, createToggleButton, createIcon } from './ui/design-system/index.js'
