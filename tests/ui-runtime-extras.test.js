/**
 * @file Tests for ui-runtime-extras.
 */

import './helpers/dom.js'
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { isEditorChromeTarget, registerChromeSelector } from '../src/ui/runtime/interaction-guard.js'
import { positionElement, flipPlacement } from '../src/ui/runtime/positioning.js'
import { SelectionMenuController } from '../src/ui/runtime/selection-menu-controller.js'
import { createSelectItem } from '../src/ui/select/SelectItem.js'
import { createSelectTrigger } from '../src/ui/select/SelectTrigger.js'

function stubRect(el, rect) {
  el.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect,
  })
}

describe('ui/runtime/interaction-guard', () => {
  it('isEditorChromeTarget returns false for null target or missing closest', () => {
    assert.equal(isEditorChromeTarget(null), false)
    assert.equal(isEditorChromeTarget({}), false)
  })

  it('registerChromeSelector makes isEditorChromeTarget recognize elements matching the selector', () => {
    registerChromeSelector('.my-toolbar-xyz')
    const toolbar = document.createElement('div')
    toolbar.className = 'my-toolbar-xyz'
    const button = document.createElement('button')
    toolbar.appendChild(button)
    document.body.appendChild(toolbar)

    assert.equal(isEditorChromeTarget(button), true)
  })

  it('isEditorChromeTarget returns false when no registered selector matches', () => {
    const outsider = document.createElement('div')
    outsider.className = 'unregistered-abc'
    document.body.appendChild(outsider)

    assert.equal(isEditorChromeTarget(outsider), false)
  })
})

describe('ui/runtime/positioning', () => {
  it('positionElement positions below anchor by default (placement=bottom)', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { top: 100, bottom: 120, left: 50, width: 40, height: 20 })
    stubRect(element, { width: 30, height: 10 })

    positionElement({ anchor, element })

    assert.equal(element.style.position, 'fixed')
    assert.equal(element.style.top, '124px')
  })

  it('positionElement with placement=top positions above the anchor', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { top: 100, bottom: 120, left: 50, width: 40, height: 20 })
    stubRect(element, { width: 30, height: 10 })

    positionElement({ anchor, element, placement: 'top' })

    assert.equal(element.style.top, '86px')
  })

  it('positionElement clamps to not exceed viewport (left)', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { top: 10, bottom: 20, left: -50, width: 10, height: 10 })
    stubRect(element, { width: 30, height: 10 })

    positionElement({ anchor, element })

    assert.equal(element.style.left, '8px')
  })

  it('positionElement aligns to the anchor left edge by default (not centered)', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { top: 100, bottom: 120, left: 200, width: 40, height: 20 })
    stubRect(element, { width: 30, height: 10 })

    positionElement({ anchor, element })

    assert.equal(element.style.left, '200px')
  })

  it('positionElement never touches the boundary edges (keeps a margin on both sides)', () => {
    const boundary = document.createElement('div')
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(boundary, anchor, element)

    stubRect(boundary, { left: 100, right: 500, top: 0, bottom: 400 })
    // Anchor near the boundary's right edge — popover would overflow past it.
    stubRect(anchor, { top: 10, bottom: 30, left: 480, right: 495, width: 15, height: 20 })
    stubRect(element, { width: 200, height: 50 })

    positionElement({ anchor, element, boundary })

    const left = Number.parseFloat(element.style.left)
    assert.ok(left >= 108, `left (${left}) should not be closer than the 8px margin to the boundary's left edge`)
    assert.ok(left + 200 <= 492, `right edge (${left + 200}) should not be closer than the 8px margin to the boundary's right edge`)
  })

  it('positionElement stays within the boundary even when anchor is near its left edge', () => {
    const boundary = document.createElement('div')
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(boundary, anchor, element)

    stubRect(boundary, { left: 100, right: 500, top: 0, bottom: 400 })
    stubRect(anchor, { top: 10, bottom: 30, left: 105, right: 120, width: 15, height: 20 })
    stubRect(element, { width: 200, height: 50 })

    positionElement({ anchor, element, boundary })

    const left = Number.parseFloat(element.style.left)
    assert.ok(left >= 108, `left (${left}) should not be closer than the 8px margin to the boundary's left edge`)
  })

  it('positionElement with lockPlacement never moves the popover above the anchor, shrinking it instead', () => {
    const boundary = document.createElement('div')
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(boundary, anchor, element)

    stubRect(boundary, { left: 0, right: 500, top: 0, bottom: 200 })
    // Anchor near the bottom of the boundary — too little room below for
    // the full popover height.
    stubRect(anchor, { top: 160, bottom: 180, left: 50, right: 90, width: 40, height: 20 })
    stubRect(element, { width: 100, height: 150 })

    positionElement({ anchor, element, boundary, lockPlacement: true })

    const top = Number.parseFloat(element.style.top)
    assert.equal(top, 184, 'top should stay pinned right below the anchor (180 + 4px offset)')
    const maxHeight = Number.parseFloat(element.style.maxHeight)
    assert.ok(maxHeight <= 8, `maxHeight (${maxHeight}) should shrink to the remaining space below the anchor instead of flipping above it`)
  })

  it('flipPlacement inverts bottom→top when no space below in viewport', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { bottom: window.innerHeight - 5 })
    stubRect(element, { height: 50 })

    assert.equal(flipPlacement(anchor, element, 'bottom'), 'top')
  })

  it('flipPlacement keeps bottom when sufficient space', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { bottom: 100 })
    stubRect(element, { height: 20 })

    assert.equal(flipPlacement(anchor, element, 'bottom'), 'bottom')
  })

  it('flipPlacement inverts top→bottom when no space above', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { top: 5 })
    stubRect(element, { height: 50 })

    assert.equal(flipPlacement(anchor, element, 'top'), 'bottom')
  })

  it('flipPlacement inverts right→left when no space on the right', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { right: window.innerWidth - 5, left: window.innerWidth - 40, width: 35 })
    stubRect(element, { width: 80 })

    assert.equal(flipPlacement(anchor, element, 'right'), 'left')
  })

  it('flipPlacement inverts left→right when no space on the left', () => {
    const anchor = document.createElement('div')
    const element = document.createElement('div')
    document.body.append(anchor, element)

    stubRect(anchor, { left: 5, right: 35, width: 30 })
    stubRect(element, { width: 80 })

    assert.equal(flipPlacement(anchor, element, 'left'), 'right')
  })
})

describe('ui/runtime/SelectionMenuController', () => {
  function withMockedSelection(mockSelection, fn) {
    const original = window.getSelection
    window.getSelection = () => mockSelection
    try {
      return fn()
    } finally {
      window.getSelection = original
    }
  }

  function makeController(overrides = {}) {
    const surface = document.createElement('div')
    document.body.appendChild(surface)
    const uiRuntime = { openPopover: mock.fn(), closePopover: mock.fn() }

    const controller = new SelectionMenuController({
      surface,
      getMode: () => 'editor',
      getSelection: () => ({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 3 } }),
      getDefs: () => [{ pluginId: 'p1', def: { items: [{ id: 'a', label: 'A' }] } }],
      getPluginCtx: () => ({ t: (k) => k }),
      uiRuntime,
      t: (k) => k,
      ...overrides,
    })

    return { controller, surface, uiRuntime }
  }

  it('does not open menu when mode is not "editor"', () => {
    const { surface, uiRuntime } = makeController({ getMode: () => 'html' })
    surface.dispatchEvent(new window.Event('mouseup'))
    assert.equal(uiRuntime.openPopover.mock.callCount(), 0)
  })

  it('does not open menu when selection is collapsed', () => {
    const { surface, uiRuntime } = makeController({
      getSelection: () => ({ anchor: { block: 0, offset: 2 }, focus: { block: 0, offset: 2 } }),
    })
    surface.dispatchEvent(new window.Event('mouseup'))
    assert.equal(uiRuntime.openPopover.mock.callCount(), 0)
  })

  it('does not open menu when there are no selection menu defs', () => {
    const { surface, uiRuntime } = makeController({ getDefs: () => [] })
    surface.dispatchEvent(new window.Event('mouseup'))
    assert.equal(uiRuntime.openPopover.mock.callCount(), 0)
  })

  it('opens popover when there is non-collapsed selection, defs, and DOM range with size', () => {
    const { surface, uiRuntime } = makeController()

    const range = { getBoundingClientRect: () => ({ top: 10, left: 20, width: 30, height: 10 }) }
    const mockSelection = { rangeCount: 1, getRangeAt: () => range }

    withMockedSelection(mockSelection, () => {
      surface.dispatchEvent(new window.Event('mouseup'))
    })

    assert.equal(uiRuntime.openPopover.mock.callCount(), 1)
    const [group, opts] = uiRuntime.openPopover.mock.calls[0].arguments
    assert.equal(group, 'selection-menu')
    assert.equal(opts.placement, 'top')
  })

  it('does not open when DOM range has width and height zero (nothing really selected)', () => {
    const { surface, uiRuntime } = makeController()
    const range = { getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }) }
    const mockSelection = { rangeCount: 1, getRangeAt: () => range }

    withMockedSelection(mockSelection, () => {
      surface.dispatchEvent(new window.Event('mouseup'))
    })

    assert.equal(uiRuntime.openPopover.mock.callCount(), 0)
  })

  it('destroy() closes open popover via uiRuntime.closePopover', () => {
    const { controller, surface, uiRuntime } = makeController()
    const range = { getBoundingClientRect: () => ({ top: 10, left: 20, width: 30, height: 10 }) }
    const mockSelection = { rangeCount: 1, getRangeAt: () => range }

    withMockedSelection(mockSelection, () => {
      surface.dispatchEvent(new window.Event('mouseup'))
    })
    assert.equal(uiRuntime.openPopover.mock.callCount(), 1)

    controller.destroy()
    assert.equal(uiRuntime.closePopover.mock.callCount(), 1)
  })
})

describe('ui/select/SelectItem', () => {
  it('creates button role=option with data-value and label', () => {
    const item = createSelectItem({ value: 'a', label: 'Option A' })
    assert.equal(item.tagName, 'BUTTON')
    assert.equal(item.getAttribute('role'), 'option')
    assert.equal(item.dataset.value, 'a')
    assert.equal(item.querySelector('.bl-select__label').textContent, 'Option A')
  })

  it('respects disabled and applies fontFamily inline when provided', () => {
    const item = createSelectItem({ value: 'b', label: 'B', disabled: true, fontFamily: 'Georgia' })
    assert.equal(item.disabled, true)
    assert.equal(item.querySelector('.bl-select__label').style.fontFamily, 'Georgia')
  })
})

describe('ui/select/SelectTrigger', () => {
  it('creates button with aria-haspopup=listbox and aria-expanded=false', () => {
    const trigger = createSelectTrigger({ label: 'Select' })
    assert.equal(trigger.getAttribute('aria-haspopup'), 'listbox')
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')
    assert.equal(trigger.querySelector('.bl-select__value').textContent, 'Select')
  })

  it('applies id and disabled when provided', () => {
    const trigger = createSelectTrigger({ label: 'X', id: 'my-trigger', disabled: true })
    assert.equal(trigger.id, 'my-trigger')
    assert.equal(trigger.disabled, true)
  })
})
