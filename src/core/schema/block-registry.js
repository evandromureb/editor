/**
 * @typedef {import('../../sdk/types.js').BlockDefinition} BlockDefinition
 */

/**
 * @typedef {object} BlockRegistry
 * @property {(def: BlockDefinition) => void} registerBlock
 * @property {(type: string) => void} unregisterBlock
 * @property {(type: string) => BlockDefinition | null} getBlockByType
 * @property {(tag: string) => string | null} getBlockByTag
 * @property {() => BlockDefinition[]} getAllBlocks
 * @property {(type: string) => boolean} isVoidBlock
 * @property {(type: string) => boolean} isContainerBlock
 */

import { PARAGRAPH_BLOCK_TYPE } from './builtins.js'

/** @returns {BlockRegistry} */
export function createBlockRegistry() {
  /** @type {Map<string, BlockDefinition>} */
  const blocksByType = new Map()

  /** @type {Map<string, string>} */
  const blocksByTag = new Map()

  /**
   * @param {BlockDefinition} def
   */
  function registerBlock(def) {
    if (blocksByType.has(def.type)) {
      throw new Error(`Block already registered: ${def.type}`)
    }

    blocksByType.set(def.type, def)

    // Child-only blocks (e.g. task-item) are only ever reachable through
    // their container's own parse path — registering their tag globally
    // would hijack unrelated markup using the same tag (e.g. a plain <li>
    // pasted from Word), breaking the existing containerTags fallback.
    if (def.childOnly) return

    for (const tag of def.parseTags) {
      blocksByTag.set(tag, def.type)
    }
  }

  /**
   * @param {string} type
   */
  function unregisterBlock(type) {
    if (type === PARAGRAPH_BLOCK_TYPE) {
      throw new Error(`Built-in block cannot be removed: ${type}`)
    }

    const def = blocksByType.get(type)
    if (!def) return

    blocksByType.delete(type)
    if (def.childOnly) return

    for (const tag of def.parseTags) {
      if (blocksByTag.get(tag) === type) {
        blocksByTag.delete(tag)
      }
    }
  }

  /**
   * @param {string} type
   * @returns {BlockDefinition | null}
   */
  function getBlockByType(type) {
    return blocksByType.get(type) ?? null
  }

  /**
   * @param {string} tag
   * @returns {string | null}
   */
  function getBlockByTag(tag) {
    return blocksByTag.get(tag) ?? null
  }

  /** @returns {BlockDefinition[]} */
  function getAllBlocks() {
    return [...blocksByType.values()].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  function isVoidBlock(type) {
    return getBlockByType(type)?.void === true
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  function isContainerBlock(type) {
    return getBlockByType(type)?.isContainer === true
  }

  return {
    registerBlock,
    unregisterBlock,
    getBlockByType,
    getBlockByTag,
    getAllBlocks,
    isVoidBlock,
    isContainerBlock,
  }
}
