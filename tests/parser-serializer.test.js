/**
 * @file Tests for parser-serializer.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/core/serializer/parser.js'
import { serialize } from '../src/core/serializer/serializer.js'
import { sanitizeHtml } from '../src/core/sanitize/sanitize.js'
import { createTestRegistries } from './helpers/fixtures.js'

describe('parser and serializer', () => {
  const registries = createTestRegistries()

  it('parse simple paragraph', () => {
    const doc = parse('<p>hello</p>', registries)

    assert.equal(doc.type, 'doc')
    assert.equal(doc.content[0].type, 'paragraph')
    assert.equal(doc.content[0].content[0].text, 'hello')
  })

  it('parse bold mark', () => {
    const doc = parse('<p>texto <strong>negrito</strong></p>', registries)

    const nodes = doc.content[0].content
    assert.equal(nodes[0].text, 'texto ')
    assert.deepEqual(nodes[1].marks, ['bold'])
    assert.equal(nodes[1].text, 'negrito')
  })

  it('serialize produces HTML with marks', () => {
    const doc = parse('<p><strong>x</strong></p>', registries)
    const html = serialize(doc, registries)

    assert.match(html, /<strong>x<\/strong>/)
  })

  it('round-trip preserves content', () => {
    const input = '<p>antes <strong>bold</strong> depois</p>'
    const html = serialize(parse(input, registries), registries)

    assert.match(html, /antes/)
    assert.match(html, /<strong>bold<\/strong>/)
    assert.match(html, /depois/)
  })

  it('parse and serialize hr block', () => {
    const doc = parse('<p>a</p><hr>', registries)

    assert.equal(doc.content[0].type, 'paragraph')
    assert.equal(doc.content[1].type, 'hr')
    assert.match(serialize(doc, registries), /<hr>/)
  })

  it('sanitize removes unregistered tags', () => {
    const safe = sanitizeHtml('<p>ok</p><script>alert(1)</script>', registries)

    assert.match(safe, /ok/)
    assert.doesNotMatch(safe, /script/)
  })
})
