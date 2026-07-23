import './helpers/dom.js'
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PluginUiRuntime } from '../src/ui/runtime/index.js'
import { createFocusTrap } from '../src/ui/runtime/focus-trap.js'
import { OverlayStack } from '../src/ui/runtime/overlay-stack.js'
import { SlotManager } from '../src/ui/slots/slot-manager.js'

describe('PluginUiRuntime', () => {
  /** @type {HTMLElement} */
  let root
  /** @type {HTMLElement} */
  let overlayRoot

  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
    overlayRoot = document.createElement('div')
    root.appendChild(overlayRoot)
  })

  function createRuntime() {
    const sidebar = document.createElement('aside')
    root.appendChild(sidebar)

    return new PluginUiRuntime({
      overlayRoot,
      slotContainers: {
        'statusbar-left': document.createElement('div'),
        'statusbar-center': document.createElement('div'),
        'statusbar-right': document.createElement('div'),
        sidebar,
        toolbar: document.createElement('header'),
      },
    })
  }

  it('opens and closes dialog with increasing z-index', () => {
    const runtime = createRuntime()

    runtime.openDialog('test-plugin', { id: 'd1', title: 'Dialog 1', content: 'Hello' })
    runtime.openDialog('test-plugin', { id: 'd2', title: 'Dialog 2', content: 'World' })

    assert.equal(runtime.overlayStack.size, 2)

    runtime.closeDialog('d1')
    assert.equal(runtime.overlayStack.size, 1)

    runtime.closeDialog('d2')
    assert.equal(runtime.overlayStack.size, 0)
  })

  it('unregisterPlugin removes overlays and slots', () => {
    const runtime = createRuntime()
    const el = document.createElement('span')
    el.textContent = 'plugin-ui'

    runtime.mountSlot('sidebar', 'my-plugin', el, 'panel-1')
    runtime.openPopover('my-plugin', {
      id: 'pop-1',
      anchor: document.createElement('button'),
      content: 'popover',
    })

    assert.equal(runtime.overlayStack.size, 1)
    runtime.unregisterPlugin('my-plugin')
    assert.equal(runtime.overlayStack.size, 0)
    assert.equal(runtime.slots.getContainer('sidebar')?.childElementCount, 0)
  })

  function createRuntimeWithBoundary(boundary) {
    return new PluginUiRuntime({
      overlayRoot,
      boundary,
      slotContainers: {
        'statusbar-left': document.createElement('div'),
        'statusbar-center': document.createElement('div'),
        'statusbar-right': document.createElement('div'),
        sidebar: document.createElement('aside'),
        toolbar: document.createElement('header'),
      },
    })
  }

  it('openPopover clamps to the runtime default boundary', () => {
    const boundary = document.createElement('div')
    root.appendChild(boundary)
    boundary.getBoundingClientRect = () => ({ left: 0, right: 200, top: 0, bottom: 400, width: 200, height: 400, x: 0, y: 0 })

    const runtime = createRuntimeWithBoundary(boundary)

    const anchor = document.createElement('button')
    root.appendChild(anchor)
    // Anchored far past the boundary's right edge (e.g. a toolbar button
    // near the editor's own right edge, outside a narrower content pane).
    anchor.getBoundingClientRect = () => ({ left: 300, right: 330, top: 10, bottom: 30, width: 30, height: 20, x: 300, y: 10 })

    runtime.openPopover('my-plugin', { id: 'pop-2', anchor, content: 'popover' })
    const popover = overlayRoot.querySelector('[role="dialog"]')

    const left = Number.parseFloat(popover.style.left)
    assert.ok(left <= 200, `left (${left}) should be clamped inside the boundary (right edge 200)`)
  })
})

describe('OverlayStack', () => {
  it('manages stack and removes by id', () => {
    const root = document.createElement('div')
    const stack = new OverlayStack(root)

    const el = document.createElement('div')
    stack.push({ id: 'a', pluginId: 'p', element: el })
    assert.equal(stack.size, 1)

    assert.ok(stack.remove('a'))
    assert.equal(stack.size, 0)
  })
})

describe('FocusTrap', () => {
  it('activates and deactivates without error', () => {
    const container = document.createElement('div')
    const btn = document.createElement('button')
    container.appendChild(btn)
    document.body.appendChild(container)

    const trap = createFocusTrap(container)
    trap.activate()
    trap.deactivate()
  })
})

describe('SlotManager', () => {
  it('mounts and unmounts per plugin', () => {
    const container = document.createElement('div')
    const slots = new SlotManager({ sidebar: container })

    const el = document.createElement('div')
    slots.mount('sidebar', 'plugin-a', 'panel', el)
    assert.equal(container.childElementCount, 1)

    slots.unmount('sidebar', 'plugin-a', 'panel')
    assert.equal(container.childElementCount, 0)
  })
})
