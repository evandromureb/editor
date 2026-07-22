/** @typedef {import('./block-registry.js').BlockRegistry} BlockRegistry */

export const PARAGRAPH_BLOCK_TYPE = 'paragraph'

/**
 * @param {BlockRegistry} blocks
 */
export function registerBuiltinBlocks(blocks) {
  if (blocks.getBlockByType(PARAGRAPH_BLOCK_TYPE)) return

  blocks.registerBlock({
    type: PARAGRAPH_BLOCK_TYPE,
    tag: 'p',
    parseTags: ['p'],
    containerTags: ['div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol'],
    priority: -1000,
  })
}
