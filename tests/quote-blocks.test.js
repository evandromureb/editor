/**
 * @file Tests for quote block Enter behavior.
 */

import './helpers/dom.js'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { splitParagraph, insertText } from '../src/core/operations/operations.js'
import { setBlockTypeForSelection } from '../src/core/operations/blocks.js'
import { createEditorRegistries } from '../src/core/schema/index.js'
import { block } from '../src/sdk/helpers.js'
import { docNode, paragraphNode, textNode } from '../src/core/document/nodes.js'
import { getParagraphText } from '../src/core/document/text-utils.js'

function createRegistries() {
  const registries = createEditorRegistries()
  for (const type of ['quote', 'quote-info', 'quote-warning', 'quote-danger']) {
    registries.blocks.registerBlock(
      block(type, {
        tag: 'blockquote',
        softBreakOnEnter: true,
      }),
    )
  }
  return registries
}

function quoteNode(type, text) {
  return { type, content: [textNode(text)] }
}

function stateWithQuote(type, text, blockIndex = 0, offset = text.length) {
  return {
    doc: docNode([quoteNode(type, text)]),
    selection: {
      anchor: { block: blockIndex, offset },
      focus: { block: blockIndex, offset },
    },
  }
}

describe('quote blocks — Enter behavior', () => {
  const registries = createRegistries()

  // Enter inside a `softBreakOnEnter` block (e.g. quote) creates a new
  // internal paragraph, separated by U+2029 PARAGRAPH SEPARATOR. Shift+Enter
  // (via insertText('\n')) still inserts a plain soft line break.
  const PS = ' '

  it('first Enter creates a new internal paragraph inside the same quote block', () => {
    const before = stateWithQuote('quote', 'Hello')
    const after = splitParagraph(before, registries)

    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].type, 'quote')
    assert.equal(after.doc.content[0].content[0].text, `Hello${PS}`)
    assert.equal(after.selection.anchor.block, 0)
    assert.equal(after.selection.anchor.offset, 6)
  })

  it('second Enter on the empty trailing paragraph exits to a new paragraph', () => {
    const before = stateWithQuote('quote', `Hello${PS}`, 0, 6)
    const after = splitParagraph(before, registries)

    assert.equal(after.doc.content.length, 2)
    assert.equal(after.doc.content[0].type, 'quote')
    assert.equal(after.doc.content[0].content[0].text, 'Hello')
    assert.equal(after.doc.content[1].type, 'paragraph')
    assert.equal(after.selection.anchor.block, 1)
    assert.equal(after.selection.anchor.offset, 0)
  })

  it('Enter in the middle of quote text splits it into two internal paragraphs', () => {
    const before = stateWithQuote('quote-info', 'Hello world', 0, 5)
    const after = splitParagraph(before, registries)

    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].type, 'quote-info')
    assert.equal(after.doc.content[0].content[0].text, `Hello${PS} world`)
    assert.equal(after.selection.anchor.offset, 6)
  })

  it('empty quote requires two Enters to exit to paragraph', () => {
    const before = stateWithQuote('quote', '', 0, 0)
    const afterFirst = splitParagraph(before, registries)

    assert.equal(afterFirst.doc.content.length, 1)
    assert.equal(afterFirst.doc.content[0].type, 'quote')
    assert.equal(afterFirst.doc.content[0].content[0].text, PS)

    const afterSecond = splitParagraph(afterFirst, registries)

    assert.equal(afterSecond.doc.content.length, 1)
    assert.equal(afterSecond.doc.content[0].type, 'paragraph')
  })

  it('Shift+Enter keeps inserting a soft line break, distinct from Enter', () => {
    const before = stateWithQuote('quote', 'Line 1', 0, 6)
    const after = insertText(before, registries, '\n')

    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].type, 'quote')
    assert.equal(after.doc.content[0].content[0].text, 'Line 1\n')
  })

  it('multiple internal paragraphs stay in one quote block', () => {
    const before = stateWithQuote('quote', `Line 1${PS}Line 2`, 0, 6)
    const after = splitParagraph(before, registries)

    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].content[0].text, `Line 1${PS}${PS}Line 2`)
  })

  it('paragraph split still creates paragraph (unchanged default)', () => {
    const before = {
      doc: docNode([paragraphNode([textNode('abc')])]),
      selection: {
        anchor: { block: 0, offset: 1 },
        focus: { block: 0, offset: 1 },
      },
    }
    const after = splitParagraph(before, registries)

    assert.equal(after.doc.content[0].type, 'paragraph')
    assert.equal(after.doc.content[1].type, 'paragraph')
  })

  it('shift+enter inserts a line break inside a paragraph', () => {
    const before = {
      doc: docNode([paragraphNode([textNode('Hello world')])]),
      selection: {
        anchor: { block: 0, offset: 5 },
        focus: { block: 0, offset: 5 },
      },
    }
    const after = insertText(before, registries, '\n')

    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].content[0].text, 'Hello\n world')
    assert.equal(after.selection.anchor.offset, 6)
  })
})

describe('quote blocks — multi-paragraph selection', () => {
  const registries = createRegistries()

  it('merges multiple paragraphs into a single quote block', () => {
    const before = {
      doc: docNode([
        paragraphNode([textNode('Line 1')]),
        paragraphNode([textNode('Line 2')]),
        paragraphNode([textNode('Line 3')]),
      ]),
      selection: {
        anchor: { block: 0, offset: 0 },
        focus: { block: 2, offset: 6 },
      },
    }

    const after = setBlockTypeForSelection(before, registries, 'quote')

    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].type, 'quote')
    const mergedText = after.doc.content[0].content.map((node) => node.text).join('')
    assert.equal(mergedText, 'Line 1\nLine 2\nLine 3')
    assert.equal(after.selection.anchor.block, 0)
    assert.equal(after.selection.anchor.offset, 'Line 1\nLine 2\nLine 3'.length)
  })
})

describe('quote blocks — HTML serialization', () => {
  const registries = createRegistries()

  it('serialize includes data-block attribute for quote variants', async () => {
    const { serialize } = await import('../src/core/serializer/serializer.js')
    const doc = docNode([
      quoteNode('quote', 'Default'),
      quoteNode('quote-info', 'Info'),
      quoteNode('quote-warning', 'Warning'),
      quoteNode('quote-danger', 'Danger'),
    ])

    const html = serialize(doc, registries)

    assert.match(html, /<blockquote data-block="quote">Default<\/blockquote>/)
    assert.match(html, /<blockquote data-block="quote-info">Info<\/blockquote>/)
    assert.match(html, /<blockquote data-block="quote-warning">Warning<\/blockquote>/)
    assert.match(html, /<blockquote data-block="quote-danger">Danger<\/blockquote>/)
  })

  it('serialize line breaks inside quote as br elements', async () => {
    const { serialize } = await import('../src/core/serializer/serializer.js')
    const doc = docNode([quoteNode('quote', 'Line 1\nLine 2')])

    const html = serialize(doc, registries)

    assert.match(html, /<blockquote data-block="quote">Line 1<br>Line 2<\/blockquote>/)
  })

  it('parse restores line breaks from br inside blockquote', async () => {
    const { parse } = await import('../src/core/serializer/parser.js')
    const doc = parse(
      '<blockquote data-block="quote">Line 1<br>Line 2</blockquote>',
      registries,
    )

    assert.equal(doc.content[0].type, 'quote')
    assert.equal(getParagraphText(doc.content[0].content), 'Line 1\nLine 2')
  })

  it('parse restores quote variant from data-block attribute', async () => {
    const { parse } = await import('../src/core/serializer/parser.js')
    const doc = parse(
      '<blockquote data-block="quote-info">Info text</blockquote>',
      registries,
    )

    assert.equal(doc.content[0].type, 'quote-info')
    assert.equal(doc.content[0].content[0].text, 'Info text')
  })

  it('sanitize preserves data-block on blockquote', async () => {
    const { sanitizeHtml } = await import('../src/core/sanitize/sanitize.js')
    const safe = sanitizeHtml(
      '<blockquote data-block="quote-danger">Alert</blockquote>',
      registries,
    )

    assert.match(safe, /data-block="quote-danger"/)
    assert.match(safe, /Alert/)
  })
})
