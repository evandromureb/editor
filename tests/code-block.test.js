/**
 * @file Tests for code-block Enter behavior.
 */

import './helpers/dom.js'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { splitParagraph } from '../src/core/operations/operations.js'
import { createEditorRegistries } from '../src/core/schema/index.js'
import { block } from '../src/sdk/helpers.js'
import { docNode, textNode } from '../src/core/document/nodes.js'

function createRegistries() {
  const registries = createEditorRegistries()
  registries.blocks.registerBlock(
    block('code-block', {
      tag: 'pre',
      softBreakOnEnter: true,
      softBreakSeparator: '\n',
    })
  )
  return registries
}

function codeBlockNode(text) {
  return { type: 'code-block', content: [textNode(text)] }
}

function stateWithCodeBlock(text, offset = text.length) {
  return {
    doc: docNode([codeBlockNode(text)]),
    selection: {
      anchor: { block: 0, offset },
      focus: { block: 0, offset },
    },
  }
}

describe('code-block — Enter behavior', () => {
  const registries = createRegistries()

  it('first Enter at end inserts a newline inside the code block', () => {
    const before = stateWithCodeBlock('const x = 1')
    const after = splitParagraph(before, registries)

    assert.equal(after.doc.content.length, 1)
    assert.equal(after.doc.content[0].type, 'code-block')
    assert.equal(after.doc.content[0].content[0].text, 'const x = 1\n')
    assert.equal(after.selection.anchor.offset, 12)
  })

  it('second Enter on the empty trailing line exits to a new paragraph', () => {
    const before = stateWithCodeBlock('const x = 1\n', 12)
    const after = splitParagraph(before, registries)

    assert.equal(after.doc.content.length, 2)
    assert.equal(after.doc.content[0].type, 'code-block')
    assert.equal(after.doc.content[0].content[0].text, 'const x = 1')
    assert.equal(after.doc.content[1].type, 'paragraph')
    assert.equal(after.selection.anchor.block, 1)
    assert.equal(after.selection.anchor.offset, 0)
  })

  it('empty code block requires two Enters to exit to paragraph', () => {
    const before = stateWithCodeBlock('', 0)
    const afterFirst = splitParagraph(before, registries)

    assert.equal(afterFirst.doc.content.length, 1)
    assert.equal(afterFirst.doc.content[0].type, 'code-block')
    assert.equal(afterFirst.doc.content[0].content[0].text, '\n')

    const afterSecond = splitParagraph(afterFirst, registries)

    assert.equal(afterSecond.doc.content.length, 1)
    assert.equal(afterSecond.doc.content[0].type, 'paragraph')
  })
})

describe('code-block — HTML serialization and preview', () => {
  const registries = createRegistries()

  it('serialize includes data-block attribute on pre', async () => {
    const { serialize } = await import('../src/core/serializer/serializer.js')
    const doc = docNode([codeBlockNode('line1\nline2')])

    const html = serialize(doc, registries)

    assert.match(html, /<pre data-block="code-block">line1<br>line2<\/pre>/)
  })

  it('sanitize adds data-block to legacy pre without attribute', async () => {
    const { sanitizeHtml } = await import('../src/core/sanitize/sanitize.js')
    const safe = sanitizeHtml('<pre>legacy</pre>', registries)

    assert.match(safe, /<pre data-block="code-block">legacy<\/pre>/)
  })

  it('enhanceCodeBlockPreElements adds gutter for preview rendering', async () => {
    const { enhanceCodeBlockPreElements } =
      await import('../src/core/pipeline/code-block-render.js')
    const preview = document.createElement('div')
    preview.innerHTML = '<pre data-block="code-block">a<br>b</pre>'

    enhanceCodeBlockPreElements(preview)

    const pre = preview.querySelector('pre')
    assert.ok(pre?.querySelector('.editor__code-gutter'))
    assert.ok(pre?.querySelector('.editor__code-body'))
    assert.equal(pre.querySelector('.editor__code-gutter')?.textContent, '1\n2')
  })
})
