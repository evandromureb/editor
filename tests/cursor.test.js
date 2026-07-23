/**
 * @file Tests for cursor.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  comparePos,
  clampPos,
  createSelection,
  collapseTo,
  getDirection,
  isCollapsed,
  normalize,
  toCursorState,
  resolveSelection,
  resolvePos,
  createRange,
  isEmptyRange,
  readFromDom,
  writeToDom,
  posFromPoint,
  posFromDomPoint,
  nearestPosFromPoint,
} from '../src/core/cursor/index.js'
import { createTestRegistries } from './helpers/fixtures.js'
import { docNode, paragraphNode, textNode } from '../src/core/document/nodes.js'

describe('cursor/pos', () => {
  it('comparePos orders by block and offset', () => {
    assert.equal(comparePos({ block: 0, offset: 1 }, { block: 0, offset: 2 }), -1)
    assert.equal(comparePos({ block: 1, offset: 0 }, { block: 0, offset: 9 }), 1)
    assert.equal(comparePos({ block: 2, offset: 3 }, { block: 2, offset: 3 }), 0)
  })

  it('clampPos clamps offset', () => {
    assert.deepEqual(clampPos({ block: 0, offset: 99 }, 0, 5), { block: 0, offset: 5 })
    assert.deepEqual(clampPos({ block: 0, offset: -1 }, 0, 5), { block: 0, offset: 0 })
  })
})

describe('cursor/selection', () => {
  it('normalize preserves endpoints but orders from/to', () => {
    const selection = {
      anchor: { block: 0, offset: 5 },
      focus: { block: 0, offset: 2 },
    }
    assert.deepEqual(normalize(selection), {
      from: { block: 0, offset: 2 },
      to: { block: 0, offset: 5 },
    })
  })

  it('getDirection detects forward and backward', () => {
    assert.equal(
      getDirection({ anchor: { block: 0, offset: 1 }, focus: { block: 0, offset: 4 } }),
      'forward'
    )
    assert.equal(
      getDirection({ anchor: { block: 0, offset: 4 }, focus: { block: 0, offset: 1 } }),
      'backward'
    )
    assert.equal(getDirection(createSelection(0, 2)), 'none')
  })
})

describe('cursor/cursor', () => {
  it('toCursorState exposes focus as blockId/offset', () => {
    const state = toCursorState({
      anchor: { block: 0, offset: 1 },
      focus: { block: 0, offset: 4 },
    })

    assert.equal(state.isCollapsed, false)
    assert.equal(state.direction, 'forward')
    assert.equal(state.blockId, 0)
    assert.equal(state.offset, 4)
  })

  it('toCursorState when collapsed', () => {
    const state = toCursorState(createSelection(1, 3))
    assert.equal(state.isCollapsed, true)
    assert.equal(state.direction, 'none')
    assert.equal(state.blockId, 1)
    assert.equal(state.offset, 3)
  })
})

describe('cursor/range', () => {
  it('createRange orders positions', () => {
    const range = createRange({ block: 0, offset: 5 }, { block: 0, offset: 2 })
    assert.deepEqual(range, {
      from: { block: 0, offset: 2 },
      to: { block: 0, offset: 5 },
    })
    assert.equal(isEmptyRange(range), false)
    assert.equal(isEmptyRange(createRange({ block: 0, offset: 1 }, { block: 0, offset: 1 })), true)
  })
})

describe('cursor/resolve', () => {
  const registries = createTestRegistries()

  it('resolvePos limits offset to paragraph end', () => {
    const doc = docNode([paragraphNode([textNode('abc')])])
    assert.deepEqual(resolvePos(doc, { block: 0, offset: 99 }, registries), {
      block: 0,
      offset: 3,
    })
  })

  it('resolvePos in void block moves to adjacent paragraph', () => {
    const doc = docNode([
      paragraphNode([textNode('ab')]),
      { type: 'hr' },
      paragraphNode([textNode('cd')]),
    ])

    assert.deepEqual(resolvePos(doc, { block: 1, offset: 0 }, registries), {
      block: 0,
      offset: 2,
    })
  })

  it('resolveSelection preserves anchor and focus independently', () => {
    const doc = docNode([paragraphNode([textNode('hello')])])
    const resolved = resolveSelection(
      doc,
      {
        anchor: { block: 0, offset: 5 },
        focus: { block: 0, offset: 99 },
      },
      registries
    )

    assert.deepEqual(resolved.anchor, { block: 0, offset: 5 })
    assert.deepEqual(resolved.focus, { block: 0, offset: 5 })
  })

  it('resolvePos with removed block uses last valid block', () => {
    const doc = docNode([paragraphNode([textNode('x')])])
    assert.deepEqual(resolvePos(doc, { block: 9, offset: 0 }, registries), {
      block: 0,
      offset: 0,
    })
  })
})

describe('cursor/mapper', () => {
  it('round-trip DOM ↔ model', () => {
    const surface = document.createElement('div')
    const block = document.createElement('p')
    block.dataset.blockIndex = '0'
    block.textContent = 'Hello'
    surface.appendChild(block)
    document.body.appendChild(surface)

    writeToDom(surface, collapseTo({ block: 0, offset: 2 }))
    const read = readFromDom(surface)
    assert.ok(read)
    assert.deepEqual(read, collapseTo({ block: 0, offset: 2 }))

    writeToDom(surface, collapseTo({ block: 0, offset: 4 }))
    const updated = readFromDom(surface)
    assert.deepEqual(updated, collapseTo({ block: 0, offset: 4 }))

    surface.remove()
  })

  it('preserves backward selection in round-trip', () => {
    const surface = document.createElement('div')
    const block = document.createElement('p')
    block.dataset.blockIndex = '0'
    block.textContent = 'Hello'
    surface.appendChild(block)
    document.body.appendChild(surface)

    const backward = {
      anchor: { block: 0, offset: 5 },
      focus: { block: 0, offset: 1 },
    }

    writeToDom(surface, backward)
    const read = readFromDom(surface)
    assert.ok(read)
    assert.deepEqual(read.anchor, backward.anchor)
    assert.deepEqual(read.focus, backward.focus)

    surface.remove()
  })

  it('preserves selection across multiple blocks', () => {
    const surface = document.createElement('div')

    const first = document.createElement('p')
    first.dataset.blockIndex = '0'
    first.textContent = 'abc'

    const second = document.createElement('p')
    second.dataset.blockIndex = '1'
    second.textContent = 'xyz'

    surface.append(first, second)
    document.body.appendChild(surface)

    const backward = {
      anchor: { block: 1, offset: 3 },
      focus: { block: 0, offset: 1 },
    }

    writeToDom(surface, backward)
    const read = readFromDom(surface)
    assert.ok(read)
    assert.deepEqual(read, backward)

    surface.remove()
  })

  it('preserves backward selection in text with inline marks', () => {
    const surface = document.createElement('div')
    const block = document.createElement('p')
    block.dataset.blockIndex = '0'

    const prefix = document.createTextNode('hello ')
    const strong = document.createElement('strong')
    strong.appendChild(document.createTextNode('world'))
    block.append(prefix, strong)
    surface.appendChild(block)
    document.body.appendChild(surface)

    const backward = {
      anchor: { block: 0, offset: 11 },
      focus: { block: 0, offset: 6 },
    }

    writeToDom(surface, backward)
    const read = readFromDom(surface)
    assert.ok(read)
    assert.deepEqual(read.anchor, backward.anchor)
    assert.deepEqual(read.focus, backward.focus)

    surface.remove()
  })

  it('maps click at block end via parent element', () => {
    const surface = document.createElement('div')
    const block = document.createElement('p')
    block.dataset.blockIndex = '0'

    const prefix = document.createTextNode('hello ')
    const strong = document.createElement('strong')
    strong.appendChild(document.createTextNode('world'))
    block.append(prefix, strong)
    surface.appendChild(block)
    document.body.appendChild(surface)

    const selection = window.getSelection()
    assert.ok(selection)
    selection.removeAllRanges()
    selection.setBaseAndExtent(block, 2, block, 2)

    const read = readFromDom(surface)
    assert.ok(read)
    assert.equal(read.anchor.offset, 11)
    assert.equal(read.focus.offset, 11)

    surface.remove()
  })

  it('maps surface selection to end of previous block', () => {
    const surface = document.createElement('div')
    const block = document.createElement('p')
    block.dataset.blockIndex = '0'
    block.textContent = 'Hello'
    surface.appendChild(block)
    document.body.appendChild(surface)

    const selection = window.getSelection()
    assert.ok(selection)
    selection.setBaseAndExtent(surface, 1, surface, 1)

    const read = readFromDom(surface)
    assert.ok(read)
    assert.equal(read.anchor.offset, 5)
    assert.equal(read.focus.offset, 5)

    surface.remove()
  })

  it('posFromDomPoint maps surface start to offset 0', () => {
    const surface = document.createElement('div')
    const block = document.createElement('p')
    block.dataset.blockIndex = '0'
    block.textContent = 'abc'
    surface.appendChild(block)
    document.body.appendChild(surface)

    const pos = posFromDomPoint(surface, surface, 0)
    assert.deepEqual(pos, { block: 0, offset: 0 })

    surface.remove()
  })

  it('posFromPoint uses caretRangeFromPoint to position after last character', () => {
    const surface = document.createElement('div')
    const block = document.createElement('p')
    block.dataset.blockIndex = '0'
    block.textContent = 'hello world'
    surface.appendChild(block)
    document.body.appendChild(surface)

    const textNode = block.firstChild
    assert.ok(textNode)

    document.caretRangeFromPoint = () => {
      const range = document.createRange()
      range.setStart(textNode, 11)
      range.collapse(true)
      return range
    }
    document.elementFromPoint = () => block

    const pos = posFromPoint(surface, 100, 20)
    assert.deepEqual(pos, { block: 0, offset: 11 })

    delete document.caretRangeFromPoint
    delete document.elementFromPoint

    surface.remove()
  })

  it('nearestPosFromPoint positions at end when clicking right of block', () => {
    const surface = document.createElement('div')
    const block = document.createElement('p')
    block.dataset.blockIndex = '0'
    block.textContent = 'abc'
    surface.appendChild(block)
    document.body.appendChild(surface)

    block.getBoundingClientRect = () => ({
      top: 0,
      bottom: 20,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 0,
    })

    const pos = nearestPosFromPoint(surface, 95, 10)
    assert.deepEqual(pos, { block: 0, offset: 3 })

    surface.remove()
  })

  it('maps click position on later quote lines to the correct offset', () => {
    const surface = document.createElement('div')
    const block = document.createElement('blockquote')
    block.dataset.blockIndex = '0'

    const line1 = document.createTextNode('Line 1')
    const br1 = document.createElement('br')
    const line2 = document.createTextNode('Line 2')
    const br2 = document.createElement('br')
    const line3 = document.createTextNode('Line 3')
    block.append(line1, br1, line2, br2, line3)
    surface.appendChild(block)
    document.body.appendChild(surface)

    const selection = window.getSelection()
    assert.ok(selection)

    selection.removeAllRanges()
    selection.setBaseAndExtent(line2, 4, line2, 4)
    assert.deepEqual(readFromDom(surface), collapseTo({ block: 0, offset: 11 }))

    selection.removeAllRanges()
    selection.setBaseAndExtent(line3, 2, line3, 2)
    assert.deepEqual(readFromDom(surface), collapseTo({ block: 0, offset: 16 }))

    surface.remove()
  })

  it('round-trip DOM ↔ model with line breaks rendered as br', () => {
    const surface = document.createElement('div')
    const block = document.createElement('blockquote')
    block.dataset.blockIndex = '0'
    block.append(document.createTextNode('Hello'), document.createElement('br'))
    surface.appendChild(block)
    document.body.appendChild(surface)

    writeToDom(surface, collapseTo({ block: 0, offset: 6 }))
    const afterFirstLine = readFromDom(surface)
    assert.ok(afterFirstLine)
    assert.deepEqual(afterFirstLine, collapseTo({ block: 0, offset: 6 }))

    const selection = window.getSelection()
    assert.ok(selection)
    selection.removeAllRanges()
    selection.setBaseAndExtent(block, 2, block, 2)

    const afterBr = readFromDom(surface)
    assert.ok(afterBr)
    assert.deepEqual(afterBr, collapseTo({ block: 0, offset: 6 }))

    surface.remove()
  })
})
