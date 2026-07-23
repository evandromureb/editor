import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InputController } from '../src/core/input-controller/input-controller.js'
import { createTestRegistries } from './helpers/fixtures.js'
import { textNode } from '../src/core/document/nodes.js'

/**
 * Regression test for a bug where keyboard/selectionchange navigation
 * between two container-block children (e.g. numbered-list-item /
 * bullet-list-item) at the *same* offset failed to update
 * `selection.anchor.childIndex`, because `selectionEquals` only compared
 * `block`/`offset` — so Tab-indenting always affected whichever item was
 * last clicked with the mouse, not the one the keyboard cursor was on.
 */
describe('InputController selection sync — container childIndex', () => {
  const registries = createTestRegistries()

  function listState() {
    return {
      doc: {
        type: 'doc',
        content: [
          {
            type: 'numbered-list',
            children: [
              { type: 'numbered-list-item', content: [textNode('One')] },
              { type: 'numbered-list-item', content: [textNode('Two')] },
              { type: 'numbered-list-item', content: [textNode('Three')] },
            ],
          },
        ],
      },
      selection: {
        anchor: { block: 0, childIndex: 1, offset: 0 },
        focus: { block: 0, childIndex: 1, offset: 0 },
      },
    }
  }

  function createController(state) {
    const surface = document.createElement('div')
    surface.className = 'editor__surface'

    const container = document.createElement('ol')
    container.dataset.blockIndex = '0'

    const items = state.doc.content[0].children
    for (const [index, item] of items.entries()) {
      const li = document.createElement('li')
      li.dataset.childIndex = String(index)
      li.textContent = item.content[0].text
      container.appendChild(li)
    }

    surface.appendChild(container)
    document.body.appendChild(surface)

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
    return { surface, container, controller, getState: () => current }
  }

  it('updates childIndex on selectionchange even when block/offset stay identical', async () => {
    const { surface, container, controller, getState } = createController(listState())

    // Keyboard navigation moves the cursor to offset 0 of item 0 ("One") —
    // same block, same offset (0) as the initial state's item 1, but a
    // different childIndex.
    const targetText = container.querySelectorAll('li')[0].firstChild
    assert.ok(targetText)

    const selection = window.getSelection()
    selection.setBaseAndExtent(targetText, 0, targetText, 0)
    document.dispatchEvent(new window.Event('selectionchange'))

    // #handleSelectionChange schedules the sync via requestAnimationFrame,
    // polyfilled as a queued microtask in tests/helpers/dom.js.
    await Promise.resolve()
    await Promise.resolve()

    const synced = getState().selection
    assert.equal(synced.anchor.block, 0)
    assert.equal(synced.anchor.offset, 0)
    assert.equal(
      synced.anchor.childIndex,
      0,
      'childIndex must follow the real DOM cursor, not stay stuck on the last clicked item'
    )

    controller.detach()
    surface.remove()
  })
})
