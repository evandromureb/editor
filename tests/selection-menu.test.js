/**
 * @file Tests for selection-menu.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildMenuItemsFromMenuDefs } from '../src/ui/runtime/menu-from-defs.js'

describe('selectionMenu menu builder', () => {
  it('aggregates items from multiple plugins with correct ctx', () => {
    let executed = false
    const boldCtx = {
      getActiveMarks: () => ['bold'],
      execCommand: (name) => {
        executed = name === 'bold'
      },
    }
    const italicCtx = {
      getActiveMarks: () => [],
      execCommand: () => false,
    }

    const items = buildMenuItemsFromMenuDefs(
      [
        {
          pluginId: 'bold',
          def: {
            id: 'fmt',
            items: [{ id: 'bold', label: 'Bold', command: 'bold' }],
            when: (ctx) => ctx.getActiveMarks().includes('bold'),
          },
        },
        {
          pluginId: 'italic',
          def: {
            id: 'fmt2',
            items: [{ id: 'italic', label: 'Italic', command: 'italic' }],
          },
        },
      ],
      (id) => (id === 'bold' ? boldCtx : italicCtx),
    )

    assert.equal(items.length, 2)
    assert.equal(items[0].label, 'Bold')
    items[0].onClick?.()
    assert.equal(executed, true)
  })
})
