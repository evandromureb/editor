/**
 * @file Schema registries public API — marks, blocks, commands, and editor registries.
 */

export { createMarkRegistry } from './mark-registry.js'
export { createBlockRegistry } from './block-registry.js'
export { createCommandRegistry } from '../commands/index.js'
export { EditorRegistries, createEditorRegistries, PARAGRAPH_BLOCK_TYPE } from './editor-registries.js'
export { registerBuiltinBlocks } from './builtins.js'
