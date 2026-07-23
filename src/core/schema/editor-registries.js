import { createMarkRegistry } from './mark-registry.js'
import { createBlockRegistry } from './block-registry.js'
import { createCommandRegistry } from '../commands/commands.js'
import { registerBuiltinBlocks, PARAGRAPH_BLOCK_TYPE } from './builtins.js'

export { PARAGRAPH_BLOCK_TYPE }

/**
 * @typedef {import('./mark-registry.js').MarkRegistry} MarkRegistry
 * @typedef {import('./block-registry.js').BlockRegistry} BlockRegistry
 * @typedef {import('../commands/commands.js').CommandRegistry} CommandRegistry
 */

/**
 * Registries isolated per editor instance.
 */
export class EditorRegistries {
  /** @type {MarkRegistry} */
  marks

  /** @type {BlockRegistry} */
  blocks

  /** @type {CommandRegistry} */
  commands

  constructor() {
    this.marks = createMarkRegistry()
    this.blocks = createBlockRegistry()
    this.commands = createCommandRegistry()
    this.registerBuiltinBlocks()
  }

  registerBuiltinBlocks() {
    registerBuiltinBlocks(this.blocks)
  }
}

/** @returns {EditorRegistries} */
export function createEditorRegistries() {
  return new EditorRegistries()
}
