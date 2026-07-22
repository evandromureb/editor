/**
 * @file Tests for operations.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { insertText, deleteBackward, splitParagraph } from '../src/core/operations/operations.js'
import { insertBlock } from '../src/core/operations/blocks.js'
import { toggleMark } from '../src/core/operations/formatting.js'
import { block } from '../src/sdk/helpers.js'
import { docNode, textNode } from '../src/core/document/nodes.js'
import { createTestRegistries, emptyState, stateWithText, withSelection } from './helpers/fixtures.js'

describe('operations', () => {
  const registries = createTestRegistries()

  it('insertText adds text at cursor', () => {
    const before = emptyState(registries)
    const after = insertText(before, registries, 'hello')

    assert.equal(after.doc.content[0].content[0].text, 'hello')
    assert.equal(after.selection.anchor.offset, 5)
  })

  it('toggleMark applies mark to selection', () => {
    const before = withSelection(stateWithText('abc', registries), 0, 3)
    const after = toggleMark(before, registries, 'bold')

    const marks = after.doc.content[0].content[0].marks
    assert.deepEqual(marks, ['bold'])
  })

  it('toggleMark removes mark when already applied', () => {
    const before = withSelection(stateWithText('abc', registries, ['bold']), 0, 3)
    const after = toggleMark(before, registries, 'bold')

    assert.equal(after.doc.content[0].content[0].marks, undefined)
  })

  it('toggleMark on collapsed cursor alters storedMarks', () => {
    const before = stateWithText('', registries)
    const after = toggleMark(before, registries, 'bold')

    assert.deepEqual(after.storedMarks, ['bold'])
  })

  it('toggleMark applies to a ranged selection inside a container child (e.g. a bullet-list item)', () => {
    const listRegistries = createTestRegistries()
    listRegistries.blocks.registerBlock(block('list-item', { childOnly: true }))
    listRegistries.blocks.registerBlock(block('bullet-list', { isContainer: true, childType: 'list-item' }))

    const before = {
      doc: docNode([
        {
          type: 'bullet-list',
          children: [{ type: 'list-item', content: [textNode('abc')] }],
        },
      ]),
      selection: {
        anchor: { block: 0, childIndex: 0, offset: 0 },
        focus: { block: 0, childIndex: 0, offset: 3 },
      },
    }

    const after = toggleMark(before, listRegistries, 'bold')
    assert.deepEqual(after.doc.content[0].children[0].content[0].marks, ['bold'])
  })

  it('toggleMark applies to every item when the selection spans multiple children of the same container', () => {
    const listRegistries = createTestRegistries()
    listRegistries.blocks.registerBlock(block('list-item', { childOnly: true }))
    listRegistries.blocks.registerBlock(block('bullet-list', { isContainer: true, childType: 'list-item' }))

    const before = {
      doc: docNode([
        {
          type: 'bullet-list',
          children: [
            { type: 'list-item', content: [textNode('One')] },
            { type: 'list-item', content: [textNode('Two')] },
            { type: 'list-item', content: [textNode('Three')] },
          ],
        },
      ]),
      selection: {
        anchor: { block: 0, childIndex: 0, offset: 1 },
        focus: { block: 0, childIndex: 2, offset: 2 },
      },
    }

    const after = toggleMark(before, listRegistries, 'bold')
    const children = after.doc.content[0].children
    // "O" of One, all of Two, "Th" of Three get bold; the untouched edges stay plain
    assert.deepEqual(children[0].content.map((n) => [n.text, n.marks]), [
      ['O', undefined],
      ['ne', ['bold']],
    ])
    assert.deepEqual(children[1].content[0].marks, ['bold'])
    assert.deepEqual(children[2].content.map((n) => [n.text, n.marks]), [
      ['Th', ['bold']],
      ['ree', undefined],
    ])
  })

  it('insertText replaces a selection spanning multiple items of the same container, merging into one item', () => {
    const listRegistries = createTestRegistries()
    listRegistries.blocks.registerBlock(block('list-item', { childOnly: true }))
    listRegistries.blocks.registerBlock(block('bullet-list', { isContainer: true, childType: 'list-item' }))

    const before = {
      doc: docNode([
        {
          type: 'bullet-list',
          children: [
            { type: 'list-item', content: [textNode('One')] },
            { type: 'list-item', content: [textNode('Two')] },
            { type: 'list-item', content: [textNode('Three')] },
          ],
        },
      ]),
      selection: {
        anchor: { block: 0, childIndex: 0, offset: 1 },
        focus: { block: 0, childIndex: 2, offset: 2 },
      },
    }

    const after = insertText(before, listRegistries, 'X')
    const children = after.doc.content[0].children
    assert.equal(children.length, 1)
    assert.equal(children[0].content[0].text, 'OXree')
  })

  it('insertBlock inserts void hr block after paragraph', () => {
    const before = stateWithText('before', registries)
    const after = insertBlock(before, registries, 'hr')

    assert.ok(after.doc.content.some((block) => block.type === 'hr'))
    assert.equal(after.doc.content[0].content[0].text, 'before')
  })

  it('splitParagraph divides paragraph at cursor', () => {
    const before = stateWithText('abcdef', registries)
    before.selection = {
      anchor: { block: 0, offset: 3 },
      focus: { block: 0, offset: 3 },
    }

    const after = splitParagraph(before, registries)

    assert.equal(after.doc.content.length, 2)
    assert.equal(after.doc.content[0].content[0].text, 'abc')
    assert.equal(after.doc.content[1].content[0].text, 'def')
    assert.equal(after.selection.anchor.block, 1)
    assert.equal(after.selection.anchor.offset, 0)
  })

  it('deleteBackward removes previous character', () => {
    const before = stateWithText('ab', registries)
    const after = deleteBackward(before, registries)

    assert.equal(after.doc.content[0].content[0].text, 'a')
    assert.equal(after.selection.anchor.offset, 1)
  })

  it('deleteBackward at the start of a paragraph re-enters the previous container, appending onto its last item', () => {
    const listRegistries = createTestRegistries()
    listRegistries.blocks.registerBlock(block('list-item', { childOnly: true }))
    listRegistries.blocks.registerBlock(block('bullet-list', { isContainer: true, childType: 'list-item' }))

    const before = {
      doc: docNode([
        {
          type: 'bullet-list',
          children: [
            { type: 'list-item', content: [textNode('One')] },
            { type: 'list-item', content: [textNode('Two')] },
          ],
        },
        { type: 'paragraph', content: [textNode('')] },
      ]),
      selection: {
        anchor: { block: 1, offset: 0 },
        focus: { block: 1, offset: 0 },
      },
    }

    const after = deleteBackward(before, listRegistries)

    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].type, 'bullet-list')
    assert.equal(after.doc.content[0].children.length, 2)
    assert.equal(after.doc.content[0].children[1].content[0].text, 'Two')
    assert.deepEqual(after.selection.anchor, { block: 0, childIndex: 1, offset: 3 })
  })
})
