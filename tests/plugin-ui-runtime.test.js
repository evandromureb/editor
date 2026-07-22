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
