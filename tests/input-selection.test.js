import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InputController } from '../src/core/input-controller/input-controller.js'
import { createTestRegistries, stateWithText } from './helpers/fixtures.js'

describe('InputController selection sync', () => {
  const registries = createTestRegistries()

  /**
   * @param {import('../src/core/operations/types.js').EditorState} state
   */
  function createController(state) {
    const surface = document.createElement('div')
    surface.className = 'editor__surface'

    const block = document.createElement('p')
    block.dataset.blockIndex = '0'
    block.textContent = state.doc.content[0]?.content?.[0]?.text ?? ''
    surface.appendChild(block)
    document.body.appendChild(surface)

    /** @type {import('../src/core/operations/types.js').EditorState} */
    let current = state

    const controller = new InputController({
      surface,
      getState: () => current,
      getRegistries: () => registries,
      dispatch: () => {},
      undo: () => {},
      redo: () => {},
      setSelection: (selection) => {
        current = {
          ...current,
          selection: {
            anchor: { ...selection.anchor },
            focus: { ...selection.focus },
          },
        }
      },
    })

    controller.attach()
    return { surface, controller, getState: () => current }
  }

  it('collapses selection when clicking at end of text', () => {
    const initial = stateWithText('hello world', registries)
    initial.selection = {
      anchor: { block: 0, offset: 0 },
      focus: { block: 0, offset: 11 },
    }

    const { surface, controller, getState } = createController(initial)
    const textNode = surface.querySelector('p')?.firstChild
    assert.ok(textNode)

    surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    const selection = window.getSelection()
    assert.ok(selection)
    selection.setBaseAndExtent(textNode, 11, textNode, 11)

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    const synced = getState().selection
    assert.equal(synced.anchor.offset, 11)
    assert.equal(synced.focus.offset, 11)

    controller.detach()
    surface.remove()
  })

  it('syncs backward selection on mouseup after drag', () => {
    const initial = stateWithText('hello world', registries)
    const { surface, controller, getState } = createController(initial)
    const textNode = surface.querySelector('p')?.firstChild
    assert.ok(textNode)

    surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    const selection = window.getSelection()
    assert.ok(selection)
    selection.setBaseAndExtent(textNode, 11, textNode, 1)
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    const synced = getState().selection
    assert.equal(synced.anchor.offset, 11)
    assert.equal(synced.focus.offset, 1)

    controller.detach()
    surface.remove()
  })

  it('does not sync expanded selection before mouseup', () => {
    const initial = stateWithText('hello world', registries)
    initial.selection = {
      anchor: { block: 0, offset: 0 },
      focus: { block: 0, offset: 0 },
    }

    const { surface, controller, getState } = createController(initial)
    const textNode = surface.querySelector('p')?.firstChild
    assert.ok(textNode)

    surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    const selection = window.getSelection()
    assert.ok(selection)
    selection.setBaseAndExtent(textNode, 11, textNode, 1)

    assert.equal(getState().selection.focus.offset, 0)

    controller.detach()
    surface.remove()
  })

  it('syncs via posFromPoint when readFromDom fails on mouseup', () => {
    const initial = stateWithText('hello', registries)
    const { surface, controller, getState } = createController(initial)

    const textNode = surface.querySelector('p')?.firstChild
    assert.ok(textNode)

    document.caretRangeFromPoint = () => {
      const range = document.createRange()
      range.setStart(textNode, 3)
      range.collapse(true)
      return range
    }
    document.elementFromPoint = () => surface.querySelector('p')

    const stray = document.createTextNode('')
    surface.appendChild(stray)

    surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }))

    const selection = window.getSelection()
    assert.ok(selection)
    selection.setBaseAndExtent(stray, 0, stray, 0)

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 10, clientY: 10 }))

    const synced = getState().selection
    assert.equal(synced.anchor.offset, 3)
    assert.equal(synced.focus.offset, 3)

    delete document.caretRangeFromPoint
    delete document.elementFromPoint

    controller.detach()
    surface.remove()
  })

  it('collapses expanded selection when clicking elsewhere', () => {
    const initial = stateWithText('hello world', registries)
    initial.selection = {
      anchor: { block: 0, offset: 0 },
      focus: { block: 0, offset: 11 },
    }

    const { surface, controller, getState } = createController(initial)
    const textNode = surface.querySelector('p')?.firstChild
    assert.ok(textNode)

    surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    const selection = window.getSelection()
    assert.ok(selection)
    selection.setBaseAndExtent(textNode, 3, textNode, 3)

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    const synced = getState().selection
    assert.equal(synced.anchor.offset, 3)
    assert.equal(synced.focus.offset, 3)
    assert.equal(synced.anchor.block, synced.focus.block)

    controller.detach()
    surface.remove()
  })

  it('collapses expanded selection when clicking end even when DOM keeps highlight', () => {
    const initial = stateWithText('hello world', registries)
    initial.selection = {
      anchor: { block: 0, offset: 0 },
      focus: { block: 0, offset: 11 },
    }

    const { surface, controller, getState } = createController(initial)
    const block = surface.querySelector('p')
    const textNode = block?.firstChild
    assert.ok(textNode)
    assert.ok(block)

    block.getBoundingClientRect = () => ({
      top: 0,
      bottom: 20,
      left: 0,
      right: 200,
      width: 200,
      height: 20,
      x: 0,
      y: 0,
    })

    surface.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 190, clientY: 10 }))

    const selection = window.getSelection()
    assert.ok(selection)
    selection.setBaseAndExtent(textNode, 0, textNode, 11)

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 190, clientY: 10 }))

    const synced = getState().selection
    assert.equal(synced.anchor.offset, 11)
    assert.equal(synced.focus.offset, 11)
    assert.equal(synced.anchor.block, synced.focus.block)

    controller.detach()
    surface.remove()
  })
})
