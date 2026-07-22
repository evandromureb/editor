/**
 * @file Tests for html-mode.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parse, serialize, validateHtml, selectionToHtmlOffsets, htmlOffsetsToSelection } from '../src/core/serializer/index.js'
import { createSelection } from '../src/core/cursor/index.js'
import { createTestRegistries } from './helpers/fixtures.js'

describe('HTML mode', () => {
  const registries = createTestRegistries()

  describe('validateHtml', () => {
    it('accepts valid HTML', () => {
      const result = validateHtml('<p>hello</p>', registries)
      assert.equal(result.valid, true)
    })

    it('aceita string vazia', () => {
      const result = validateHtml('   ', registries)
      assert.equal(result.valid, true)
    })

    it('rejects content completely removed by sanitize', () => {
      const result = validateHtml('<iframe></iframe>', registries)
      assert.equal(result.valid, false)
      assert.equal(result.message, 'disallowed')
    })
  })

  describe('html-offsets', () => {
    it('maps collapsed selection to offset in HTML', () => {
      const doc = parse('<p>hello</p>', registries)
      const html = serialize(doc, registries)
      const selection = createSelection(0, 2)

      const offsets = selectionToHtmlOffsets(doc, selection, registries)
      const slice = html.slice(0, offsets.anchor)

      assert.match(slice, /<p>he$/)
      assert.equal(offsets.anchor, offsets.focus)
    })

    it('round-trip preserves position in simple paragraph', () => {
      const doc = parse('<p>hello world</p>', registries)
      const html = serialize(doc, registries)
      const selection = createSelection(0, 6)

      const offsets = selectionToHtmlOffsets(doc, selection, registries)
      const restored = htmlOffsetsToSelection(html, offsets.anchor, offsets.focus, registries)

      assert.equal(restored.focus.block, 0)
      assert.equal(restored.focus.offset, 6)
    })

    it('round-trip after text editing maintains approximate offset', () => {
      const edited = '<p>abcd</p>'
      const selection = htmlOffsetsToSelection(edited, 7, 7, registries)

      assert.equal(selection.focus.block, 0)
      assert.equal(selection.focus.offset, 4)
    })
  })

  describe('round-trip doc → HTML → doc', () => {
    it('preserves content with marks', () => {
      const input = '<p>antes <strong>bold</strong> depois</p>'
      const doc = parse(input, registries)
      const html = serialize(doc, registries)
      const roundTrip = parse(html, registries)

      assert.equal(roundTrip.content[0].content.length, doc.content[0].content.length)
      assert.deepEqual(roundTrip.content[0].content[1].marks, ['bold'])
    })
  })
})
