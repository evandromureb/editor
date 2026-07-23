/**
 * @file Tests for overlay-click-outside.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { OverlayStack } from '../src/ui/runtime/overlay-stack.js'

describe('OverlayStack click-outside', () => {
  it('closes non-modal popover when clicking outside', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const stack = new OverlayStack(root)
    const anchor = document.createElement('button')
    document.body.appendChild(anchor)

    const popover = document.createElement('div')
    popover.textContent = 'menu'

    let closed = false
    stack.push({
      id: 'pop-1',
      pluginId: 'test',
      element: popover,
      anchor,
      onClose: () => {
        closed = true
        stack.remove('pop-1')
      },
      modal: false,
    })

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    assert.equal(closed, true)
    assert.equal(stack.size, 0)
  })

  it('does not close when clicking on anchor', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)

    const stack = new OverlayStack(root)
    const anchor = document.createElement('button')
    document.body.appendChild(anchor)

    const popover = document.createElement('div')
    let closed = false

    stack.push({
      id: 'pop-2',
      pluginId: 'test',
      element: popover,
      anchor,
      onClose: () => {
        closed = true
      },
      modal: false,
    })

    anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    assert.equal(closed, false)
    assert.equal(stack.size, 1)
  })
})
