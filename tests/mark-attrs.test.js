/**
 * @file Tests for setMarkAttr/clearMarkAttr/getMarkAttrInSelection — including
 * the container-child case (e.g. a bullet-list or task-list item), which
 * used to be silently ignored because these operations only looked at
 * `doc.content[pos.block]` and never at `pos.childIndex`.
 */

import './helpers/dom.js'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  setMarkAttr,
  clearMarkAttr,
  getMarkAttrInSelection,
} from '../src/core/operations/mark-attrs.js'
import { createEditorRegistries } from '../src/core/schema/index.js'
import { mark, block } from '../src/sdk/helpers.js'
import { docNode, textNode } from '../src/core/document/nodes.js'

function createRegistries() {
  const registries = createEditorRegistries()
  registries.marks.registerMark(
    mark('text-color', { tag: 'span', styleAttr: 'color', priority: 0 })
  )
  registries.blocks.registerBlock(block('list-item', { childOnly: true }))
  registries.blocks.registerBlock(
    block('bullet-list', { isContainer: true, childType: 'list-item' })
  )
  return registries
}

function stateInListItem(text) {
  return {
    doc: docNode([
      {
        type: 'bullet-list',
        children: [{ type: 'list-item', content: [textNode(text)] }],
      },
    ]),
    selection: {
      anchor: { block: 0, childIndex: 0, offset: 0 },
      focus: { block: 0, childIndex: 0, offset: text.length },
    },
  }
}

describe('mark-attrs on a container child', () => {
  it('setMarkAttr applies the value to a ranged selection inside a bullet-list item', () => {
    const registries = createRegistries()
    const before = stateInListItem('abc')

    const after = setMarkAttr(before, registries, 'text-color', '#ff0000')
    const node = after.doc.content[0].children[0].content[0]
    assert.deepEqual(node.marks, ['text-color'])
    assert.equal(node.markAttrs['text-color'], '#ff0000')
  })

  it('clearMarkAttr removes the mark from a ranged selection inside a bullet-list item', () => {
    const registries = createRegistries()
    const colored = setMarkAttr(stateInListItem('abc'), registries, 'text-color', '#ff0000')

    const after = clearMarkAttr(colored, registries, 'text-color')
    const node = after.doc.content[0].children[0].content[0]
    assert.equal(node.marks, undefined)
  })

  it('getMarkAttrInSelection reads the value back from inside a bullet-list item', () => {
    const registries = createRegistries()
    const colored = setMarkAttr(stateInListItem('abc'), registries, 'text-color', '#00ff00')

    const value = getMarkAttrInSelection(colored.doc, colored.selection, 'text-color', registries)
    assert.equal(value, '#00ff00')
  })

  it('getMarkAttrInSelection returns null when nothing is set inside a bullet-list item', () => {
    const registries = createRegistries()
    const before = stateInListItem('abc')

    const value = getMarkAttrInSelection(before.doc, before.selection, 'text-color', registries)
    assert.equal(value, null)
  })

  it('setMarkAttr applies to every item when the selection spans multiple bullet-list items', () => {
    const registries = createRegistries()
    const before = {
      doc: docNode([
        {
          type: 'bullet-list',
          children: [
            { type: 'list-item', content: [textNode('One')] },
            { type: 'list-item', content: [textNode('Two')] },
          ],
        },
      ]),
      selection: {
        anchor: { block: 0, childIndex: 0, offset: 0 },
        focus: { block: 0, childIndex: 1, offset: 3 },
      },
    }

    const after = setMarkAttr(before, registries, 'text-color', '#123456')
    const children = after.doc.content[0].children
    assert.equal(children[0].content[0].markAttrs['text-color'], '#123456')
    assert.equal(children[1].content[0].markAttrs['text-color'], '#123456')

    const value = getMarkAttrInSelection(after.doc, after.selection, 'text-color', registries)
    assert.equal(value, '#123456')
  })
})
