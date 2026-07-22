/**
 * @file Shared test fixtures: registries and editor state builders.
 */
import { createEditorRegistries } from '../../src/core/schema/index.js'
import { mark, block } from '../../src/sdk/helpers.js'
import { docNode, paragraphNode, textNode } from '../../src/core/document/nodes.js'

/**
 * Registries with bold + hr for tests.
 * @returns {import('../../src/core/schema/editor-registries.js').EditorRegistries}
 */
export function createTestRegistries() {
  const registries = createEditorRegistries()
  registries.marks.registerMark(mark('bold', { tag: 'strong', parseTags: ['strong', 'b'], priority: 0 }))
  registries.blocks.registerBlock(block('hr', { void: true }))
  return registries
}

/**
 * @param {import('../../src/core/schema/editor-registries.js').EditorRegistries} registries
 * @returns {import('../../src/core/operations/types.js').EditorState}
 */
export function emptyState(registries) {
  return {
    doc: docNode([paragraphNode([textNode('')])]),
    selection: {
      anchor: { block: 0, offset: 0 },
      focus: { block: 0, offset: 0 },
    },
  }
}

/**
 * @param {string} text
 * @param {import('../../src/core/schema/editor-registries.js').EditorRegistries} registries
 * @param {string[]} [marks]
 * @returns {import('../../src/core/operations/types.js').EditorState}
 */
export function stateWithText(text, registries, marks = []) {
  const content = marks.length
    ? [textNode(text, marks, registries)]
    : [textNode(text)]

  return {
    doc: docNode([paragraphNode(content)]),
    selection: {
      anchor: { block: 0, offset: text.length },
      focus: { block: 0, offset: text.length },
    },
  }
}

/**
 * @param {import('../../src/core/operations/types.js').EditorState} state
 * @param {number} from
 * @param {number} to
 * @returns {import('../../src/core/operations/types.js').EditorState}
 */
export function withSelection(state, from, to) {
  return {
    ...state,
    selection: {
      anchor: { block: 0, offset: from },
      focus: { block: 0, offset: to },
    },
  }
}
