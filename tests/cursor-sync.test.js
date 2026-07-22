/**
 * @file Tests for cursor-sync.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { splitParagraph, insertText } from '../src/core/operations/operations.js'
import { render } from '../src/core/renderer/renderer.js'
import { readFromDom, writeToDom, collapseTo } from '../src/core/cursor/index.js'
import { createTestRegistries, stateWithText } from './helpers/fixtures.js'
import { block } from '../src/sdk/helpers.js'
import { docNode, textNode } from '../src/core/document/nodes.js'

describe('cursor sync', () => {
  const registries = createTestRegistries()

  it('Enter creates new line immediately in the DOM', () => {
    const before = stateWithText('Hello', registries)
    before.selection = {
      anchor: { block: 0, offset: 5 },
      focus: { block: 0, offset: 5 },
    }

    const after = splitParagraph(before, registries)
    const surface = document.createElement('div')
    surface.className = 'editor__surface'

    render(before.doc, surface, { registries, selection: before.selection })
    render(after.doc, surface, { registries, selection: after.selection })

    const blocks = surface.querySelectorAll('[data-block-index]')
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0].textContent, 'Hello')
    assert.equal(blocks[1].textContent, '​')

    const domSelection = readFromDom(surface)
    assert.ok(domSelection)
    assert.equal(domSelection.anchor.block, 1)
    assert.equal(domSelection.anchor.offset, 0)
    assert.equal(domSelection.focus.block, 1)
    assert.equal(domSelection.focus.offset, 0)
  })

  it('empty paragraph is rendered as separate block', () => {
    const before = stateWithText('Hello', registries)
    before.selection = {
      anchor: { block: 0, offset: 5 },
      focus: { block: 0, offset: 5 },
    }

    const after = splitParagraph(before, registries)
    const surface = document.createElement('div')
    surface.className = 'editor__surface'

    render(after.doc, surface, { registries, selection: after.selection })
    writeToDom(surface, after.selection)

    const emptyBlock = surface.querySelector('[data-block-index="1"]')
    assert.ok(emptyBlock)
    assert.equal(emptyBlock.textContent, '​')
  })

  it('cursor repositioned without additional typing after split', () => {
    const before = stateWithText('abc', registries)
    before.selection = {
      anchor: { block: 0, offset: 3 },
      focus: { block: 0, offset: 3 },
    }

    const after = splitParagraph(before, registries)
    const surface = document.createElement('div')

    render(after.doc, surface, { registries, selection: after.selection })
    writeToDom(surface, after.selection)

    const selection = readFromDom(surface)
    assert.ok(selection)
    assert.equal(selection.focus.block, 1)
    assert.equal(selection.focus.offset, 0)
  })

  it('split in the middle preserves following blocks', () => {
    const before = stateWithText('abc', registries)
    before.doc.content.push({ type: 'paragraph', content: [{ type: 'text', text: 'xyz' }] })
    before.selection = {
      anchor: { block: 0, offset: 2 },
      focus: { block: 0, offset: 2 },
    }

    const after = splitParagraph(before, registries)
    const surface = document.createElement('div')

    render(before.doc, surface, { registries, selection: before.selection })
    render(after.doc, surface, { registries, selection: after.selection })

    const blocks = [...surface.querySelectorAll('[data-block-index]')]
    assert.equal(blocks.length, 3)
    assert.equal(blocks[0].textContent, 'ab')
    assert.equal(blocks[1].textContent, 'c')
    assert.equal(blocks[2].textContent, 'xyz')
  })

  it('Space updates DOM and cursor immediately after insertText', () => {
    const before = stateWithText('Hi', registries)
    before.selection = {
      anchor: { block: 0, offset: 2 },
      focus: { block: 0, offset: 2 },
    }

    const after = insertText(before, registries, ' ')
    const surface = document.createElement('div')

    render(after.doc, surface, { registries, selection: after.selection })
    writeToDom(surface, after.selection)

    assert.equal(surface.textContent, 'Hi\u00A0')

    const selection = readFromDom(surface)
    assert.ok(selection)
    assert.equal(selection.focus.offset, 3)
    assert.equal(selection.anchor.offset, 3)
  })

  it('renders final space as nbsp in DOM for immediate display', () => {
    const before = stateWithText('Initial text', registries)
    before.selection = {
      anchor: { block: 0, offset: 13 },
      focus: { block: 0, offset: 13 },
    }

    const after = insertText(before, registries, ' ')
    const surface = document.createElement('div')

    render(after.doc, surface, { registries, selection: after.selection })

    const block = surface.querySelector('p')
    assert.ok(block)
    assert.equal(block.textContent, 'Initial text\u00A0')
  })

  it('double Enter in quote exits to paragraph with cursor positioned correctly', () => {
    const quoteRegistries = createTestRegistries()
    quoteRegistries.blocks.registerBlock(
      block('quote', { tag: 'blockquote', softBreakOnEnter: true }),
    )

    const before = stateWithText('Hello', quoteRegistries)
    before.doc.content[0].type = 'quote'
    before.selection = {
      anchor: { block: 0, offset: 5 },
      focus: { block: 0, offset: 5 },
    }

    const afterFirstEnter = splitParagraph(before, quoteRegistries)
    const afterSecondEnter = splitParagraph(afterFirstEnter, quoteRegistries)

    const surface = document.createElement('div')
    render(afterSecondEnter.doc, surface, {
      registries: quoteRegistries,
      selection: afterSecondEnter.selection,
    })
    writeToDom(surface, afterSecondEnter.selection)

    const blocks = [...surface.querySelectorAll('[data-block-index]')]
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0].tagName.toLowerCase(), 'blockquote')
    assert.equal(blocks[0].textContent, 'Hello')
    assert.equal(blocks[1].tagName.toLowerCase(), 'p')

    const selection = readFromDom(surface)
    assert.ok(selection)
    assert.equal(selection.anchor.block, 1)
    assert.equal(selection.anchor.offset, 0)
    assert.equal(selection.focus.block, 1)
    assert.equal(selection.focus.offset, 0)
  })

  it('Shift+Enter places the cursor on the new line immediately after render', () => {
    const quoteRegistries = createTestRegistries()
    quoteRegistries.blocks.registerBlock(
      block('quote', { tag: 'blockquote', softBreakOnEnter: true }),
    )

    const before = stateWithText('Hello', quoteRegistries)
    before.doc.content[0].type = 'quote'
    before.selection = {
      anchor: { block: 0, offset: 5 },
      focus: { block: 0, offset: 5 },
    }

    const after = insertText(before, quoteRegistries, '\n')
    const surface = document.createElement('div')
    document.body.appendChild(surface)
    render(after.doc, surface, { registries: quoteRegistries, selection: after.selection })

    const quote = surface.querySelector('blockquote')
    assert.ok(quote)
    const br = quote.querySelector('br')
    assert.ok(br)
    const lineBreakAnchor = br.nextSibling
    assert.ok(lineBreakAnchor)
    assert.equal(lineBreakAnchor.nodeType, Node.TEXT_NODE)
    assert.equal(lineBreakAnchor.textContent, '​')

    const domSelection = window.getSelection()
    assert.ok(domSelection)
    assert.equal(domSelection.anchorNode, lineBreakAnchor)
    assert.equal(domSelection.anchorOffset, 0)

    const read = readFromDom(surface)
    assert.deepEqual(read, collapseTo({ block: 0, offset: 6 }))

    surface.remove()
  })

  it('single Enter in a non-empty quote paragraph creates a new internal <p>, keeping the quote block', () => {
    const quoteRegistries = createTestRegistries()
    quoteRegistries.blocks.registerBlock(
      block('quote', { tag: 'blockquote', softBreakOnEnter: true }),
    )

    const before = stateWithText('Hello', quoteRegistries)
    before.doc.content[0].type = 'quote'
    before.selection = {
      anchor: { block: 0, offset: 5 },
      focus: { block: 0, offset: 5 },
    }

    const after = splitParagraph(before, quoteRegistries)

    // Doc model: still a single quote block, with a paragraph separator
    // (U+2029) followed by an empty second paragraph.
    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].type, 'quote')
    assert.equal(after.doc.content[0].content[0].text, 'Hello ')
    assert.equal(after.selection.anchor.block, 0)
    assert.equal(after.selection.anchor.offset, 6)

    const surface = document.createElement('div')
    document.body.appendChild(surface)
    render(after.doc, surface, { registries: quoteRegistries, selection: after.selection })

    const quote = surface.querySelector('blockquote')
    assert.ok(quote)
    const paragraphs = quote.querySelectorAll('p')
    assert.equal(paragraphs.length, 2)
    assert.equal(paragraphs[0].textContent, 'Hello')
    assert.equal(paragraphs[1].textContent, '​')

    const domSelection = window.getSelection()
    assert.ok(domSelection)
    assert.ok(paragraphs[1].contains(domSelection.anchorNode))

    const read = readFromDom(surface)
    assert.deepEqual(read, collapseTo({ block: 0, offset: 6 }))

    surface.remove()
  })

  it('clicking inside a rendered multi-line quote keeps the cursor on the clicked line', () => {
    const quoteRegistries = createTestRegistries()
    quoteRegistries.blocks.registerBlock(
      block('quote', { tag: 'blockquote', softBreakOnEnter: true }),
    )

    const doc = docNode([{ type: 'quote', content: [textNode('Line 1\nLine 2\nLine 3')] }])
    const surface = document.createElement('div')
    render(doc, surface, { registries: quoteRegistries })
    document.body.appendChild(surface)

    const line3 = [...surface.querySelectorAll('blockquote')[0].childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent === 'Line 3',
    )
    assert.ok(line3)

    const selection = window.getSelection()
    assert.ok(selection)
    selection.removeAllRanges()
    selection.setBaseAndExtent(line3, 2, line3, 2)

    const read = readFromDom(surface)
    assert.ok(read)
    assert.equal(read.anchor.block, 0)
    assert.equal(read.anchor.offset, 16)

    writeToDom(surface, collapseTo({ block: 0, offset: 16 }))
    const roundTrip = readFromDom(surface)
    assert.deepEqual(roundTrip, collapseTo({ block: 0, offset: 16 }))

    surface.remove()
  })
})
