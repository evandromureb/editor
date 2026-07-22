/**
 * @file Tests for registries.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createMarkRegistry, createBlockRegistry, createCommandRegistry } from '../src/core/schema/index.js'
import { createEditorRegistries } from '../src/core/schema/editor-registries.js'
import { mark, block } from '../src/sdk/helpers.js'
import { PARAGRAPH_BLOCK_TYPE } from '../src/core/schema/builtins.js'

describe('registries', () => {
  it('mark registry rejects duplicate mark', () => {
    const marks = createMarkRegistry()
    marks.registerMark(mark('bold', { tag: 'strong', parseTags: ['strong'] }))

    assert.throws(
      () => marks.registerMark(mark('bold', { tag: 'b', parseTags: ['b'] })),
      /Mark already registered/,
    )
  })

  it('mark registry resolves tag and sorts by priority', () => {
    const marks = createMarkRegistry()
    marks.registerMark(mark('bold', { tag: 'strong', parseTags: ['strong', 'b'], priority: 0 }))
    marks.registerMark(mark('italic', { tag: 'em', parseTags: ['em'], priority: 1 }))

    assert.equal(marks.getMarkByTag('b'), 'bold')
    assert.deepEqual(marks.sortMarks(['italic', 'bold']), ['bold', 'italic'])
  })

  it('block registry identifies void blocks', () => {
    const blocks = createBlockRegistry()
    blocks.registerBlock(block('hr', { void: true }))

    assert.ok(blocks.isVoidBlock('hr'))
    assert.ok(!blocks.isVoidBlock('paragraph'))
  })

  it('EditorRegistries registers built-in paragraph', () => {
    const registries = createEditorRegistries()

    assert.ok(registries.blocks.getBlockByType(PARAGRAPH_BLOCK_TYPE))
    assert.equal(registries.blocks.getBlockByTag('p'), PARAGRAPH_BLOCK_TYPE)
  })

  it('command registry registers and retrieves commands', () => {
    const commands = createCommandRegistry()
    const handler = (state) => state

    commands.registerCommand('test', handler)

    assert.equal(commands.getCommand('test'), handler)
    assert.equal(commands.getCommand('missing'), null)
  })

  it('instance registries are independent', () => {
    const a = createEditorRegistries()
    const b = createEditorRegistries()

    a.marks.registerMark(mark('bold', { tag: 'strong', parseTags: ['strong'] }))

    assert.equal(a.marks.getMarkByName('bold')?.name, 'bold')
    assert.equal(b.marks.getMarkByName('bold'), null)
  })
})
