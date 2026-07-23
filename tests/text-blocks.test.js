/**
 * @file Tests for text-blocks.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/core/serializer/parser.js'
import { serialize } from '../src/core/serializer/serializer.js'
import { sanitizeHtml } from '../src/core/sanitize/sanitize.js'
import { setBlockType } from '../src/core/operations/blocks.js'
import { createEditorRegistries } from '../src/core/schema/index.js'
import { block } from '../src/sdk/helpers.js'
import { docNode, paragraphNode, textNode } from '../src/core/document/nodes.js'

function createRegistries() {
  const registries = createEditorRegistries()
  registries.blocks.registerBlock(block('heading-1', { tag: 'h1' }))
  registries.blocks.registerBlock(block('heading-2', { tag: 'h2' }))
  registries.blocks.registerBlock(block('heading-3', { tag: 'h3' }))
  registries.blocks.registerBlock(block('heading-4', { tag: 'h4' }))
  registries.blocks.registerBlock(block('heading-5', { tag: 'h5' }))
  return registries
}

function makeState(doc) {
  return {
    doc,
    selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
  }
}

describe('text blocks (headings)', () => {
  const registries = createRegistries()

  describe('parse', () => {
    it('h1 preserves type and content', () => {
      const doc = parse('<h1>Title</h1>', registries)
      assert.equal(doc.content[0].type, 'heading-1')
      assert.equal(doc.content[0].content[0].text, 'Title')
    })

    it('h2 preserves type', () => {
      const doc = parse('<h2>Sub</h2>', registries)
      assert.equal(doc.content[0].type, 'heading-2')
    })

    it('h3 preserves type', () => {
      const doc = parse('<h3>Sub</h3>', registries)
      assert.equal(doc.content[0].type, 'heading-3')
    })

    it('h4 preserves type', () => {
      const doc = parse('<h4>Sub</h4>', registries)
      assert.equal(doc.content[0].type, 'heading-4')
    })

    it('h5 preserves type', () => {
      const doc = parse('<h5>Sub</h5>', registries)
      assert.equal(doc.content[0].type, 'heading-5')
    })

    it('multiple blocks', () => {
      const doc = parse('<h1>A</h1><p>B</p><h2>C</h2>', registries)
      assert.equal(doc.content[0].type, 'heading-1')
      assert.equal(doc.content[1].type, 'paragraph')
      assert.equal(doc.content[2].type, 'heading-2')
    })
  })

  describe('serialize', () => {
    it('round-trip h1', () => {
      const html = serialize(parse('<h1>Title</h1>', registries), registries)
      assert.match(html, /<h1>Title<\/h1>/)
    })

    it('round-trip h2', () => {
      const html = serialize(parse('<h2>Sub</h2>', registries), registries)
      assert.match(html, /<h2>Sub<\/h2>/)
    })

    it('round-trip h3', () => {
      const html = serialize(parse('<h3>C</h3>', registries), registries)
      assert.match(html, /<h3>C<\/h3>/)
    })

    it('round-trip preserves neighboring paragraph', () => {
      const html = serialize(parse('<h1>A</h1><p>B</p>', registries), registries)
      assert.match(html, /<h1>A<\/h1>/)
      assert.match(html, /<p>B<\/p>/)
    })
  })

  describe('sanitize', () => {
    it('preserves h1 content when pasting', () => {
      const safe = sanitizeHtml('<h1>Title</h1>', registries)
      assert.match(safe, /<h1>Title<\/h1>/)
    })

    it('preserves h2 content when pasting', () => {
      const safe = sanitizeHtml('<h2>Sub</h2>', registries)
      assert.match(safe, /<h2>Sub<\/h2>/)
    })
  })

  describe('setBlockType', () => {
    it('transforms paragraph to h2 preserving content', () => {
      const doc = docNode([paragraphNode([textNode('texto')])])
      const state = makeState(doc)
      const next = setBlockType(state, registries, 'heading-2')
      assert.equal(next.doc.content[0].type, 'heading-2')
      assert.equal(next.doc.content[0].content[0].text, 'texto')
    })

    it('transforms h1 to paragraph', () => {
      const doc = parse('<h1>A</h1>', registries)
      const state = makeState(doc)
      const next = setBlockType(state, registries, 'paragraph')
      assert.equal(next.doc.content[0].type, 'paragraph')
    })

    it('transforms h2 to h3', () => {
      const doc = parse('<h2>A</h2>', registries)
      const state = makeState(doc)
      const next = setBlockType(state, registries, 'heading-3')
      assert.equal(next.doc.content[0].type, 'heading-3')
      assert.equal(next.doc.content[0].content[0].text, 'A')
    })

    it('ignores invalid or void types', () => {
      const doc = parse('<p>texto</p>', registries)
      const state = makeState(doc)
      const next = setBlockType(state, registries, 'hr')
      // hr is not registered, ignore
      assert.equal(next.doc.content[0].type, 'paragraph')
    })

    it('applies to multiple selected blocks', () => {
      const doc = parse('<p>A</p><p>B</p><p>C</p>', registries)
      const state = {
        doc,
        selection: {
          anchor: { block: 0, offset: 0 },
          focus: { block: 2, offset: 1 },
        },
      }
      const next = setBlockType(state, registries, 'heading-1')
      assert.equal(next.doc.content[0].type, 'heading-1')
      assert.equal(next.doc.content[1].type, 'heading-1')
      assert.equal(next.doc.content[2].type, 'heading-1')
    })

    it('partial selection transforms only covered blocks', () => {
      const doc = parse('<p>A</p><p>B</p><p>C</p>', registries)
      const state = {
        doc,
        selection: {
          anchor: { block: 0, offset: 0 },
          focus: { block: 1, offset: 1 },
        },
      }
      const next = setBlockType(state, registries, 'heading-2')
      assert.equal(next.doc.content[0].type, 'heading-2')
      assert.equal(next.doc.content[1].type, 'heading-2')
      assert.equal(next.doc.content[2].type, 'paragraph')
    })
  })
})
