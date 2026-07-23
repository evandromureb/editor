/**
 * @file Tests for multi-line toolbar layout.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseToolbar, parseToolbarLine } from '../src/core/presets/resolve-config.js'
import { Toolbar } from '../src/ui/toolbar/toolbar.js'
import { createPluginUi } from '../src/sdk/ui/create-plugin-ui.js'
import { PluginUiRuntime } from '../src/ui/runtime/index.js'

describe('parseToolbar', () => {
  it('parses TinyMCE-style string into a single line of tokens', () => {
    assert.deepEqual(parseToolbar('undo redo | bold italic'), [
      ['undo', 'redo', '|', 'bold', 'italic'],
    ])
  })

  it('wraps flat token array into a single line', () => {
    assert.deepEqual(parseToolbar(['bold', 'italic', '|', 'underline']), [
      ['bold', 'italic', '|', 'underline'],
    ])
  })

  it('parses multi-line array of strings', () => {
    assert.deepEqual(
      parseToolbar(['undo redo | bold italic underline', 'text-color highlight | hr']),
      [
        ['undo', 'redo', '|', 'bold', 'italic', 'underline'],
        ['text-color', 'highlight', '|', 'hr'],
      ]
    )
  })

  it('returns undefined for null, empty string and empty array', () => {
    assert.equal(parseToolbar(null), undefined)
    assert.equal(parseToolbar(''), undefined)
    assert.equal(parseToolbar([]), undefined)
  })

  it('is idempotent when toolbar is already normalized to string[][]', () => {
    const normalized = [
      ['undo', 'redo', '|', 'bold'],
      ['italic', '|', 'underline'],
    ]

    assert.deepEqual(parseToolbar(normalized), normalized)
    assert.deepEqual(
      parseToolbar(parseToolbar(['undo redo | bold', 'italic | underline'])),
      normalized
    )
  })
})

describe('parseToolbarLine', () => {
  it('trims and splits on whitespace', () => {
    assert.deepEqual(parseToolbarLine('  bold | italic  '), ['bold', '|', 'italic'])
  })
})

describe('Toolbar multi-line rendering', () => {
  it('renders each line in an independent row container', () => {
    const root = document.createElement('div')
    root.className = 'editor__toolbar-track'

    const uiRuntime = new PluginUiRuntime({
      overlayRoot: document.createElement('div'),
      slotContainers: {
        'statusbar-left': document.createElement('div'),
        'statusbar-center': document.createElement('div'),
        'statusbar-right': document.createElement('div'),
        sidebar: document.createElement('aside'),
        toolbar: root,
      },
    })

    const makeCtx = (pluginId) => ({
      getMode: () => 'editor',
      ui: createPluginUi({
        t: (key) => key,
        pluginId,
        uiRuntime,
        resolveAsset: () => null,
      }),
    })

    const makeEntry = (id) => ({
      type: 'item',
      item: { id, label: `${id}.button`, command: id },
      pluginId: id,
      ctx: makeCtx(id),
      group: 'preset',
      order: 0,
    })

    new Toolbar({
      root,
      lines: [[makeEntry('bold'), makeEntry('italic')], [makeEntry('underline')]],
      t: (key) => key,
    })

    assert.ok(root.classList.contains('editor__toolbar-track--multiline'))
    const rows = root.querySelectorAll('.editor__toolbar-row')
    assert.equal(rows.length, 2)
    assert.ok(rows[0].querySelector('.editor__toolbar-btn--bold'))
    assert.ok(rows[0].querySelector('.editor__toolbar-btn--italic'))
    assert.ok(rows[1].querySelector('.editor__toolbar-btn--underline'))
  })

  it('keeps single-line DOM unchanged without multiline modifier', () => {
    const root = document.createElement('div')
    root.className = 'editor__toolbar-track'

    const uiRuntime = new PluginUiRuntime({
      overlayRoot: document.createElement('div'),
      slotContainers: {
        'statusbar-left': document.createElement('div'),
        'statusbar-center': document.createElement('div'),
        'statusbar-right': document.createElement('div'),
        sidebar: document.createElement('aside'),
        toolbar: root,
      },
    })

    const ctx = {
      getMode: () => 'editor',
      ui: createPluginUi({
        t: (key) => key,
        pluginId: 'bold',
        uiRuntime,
        resolveAsset: () => null,
      }),
    }

    new Toolbar({
      root,
      entries: [
        {
          type: 'item',
          item: { id: 'bold', label: 'bold.button', command: 'bold' },
          pluginId: 'bold',
          ctx,
          group: 'preset',
          order: 0,
        },
      ],
      t: (key) => key,
    })

    assert.equal(root.classList.contains('editor__toolbar-track--multiline'), false)
    assert.equal(root.querySelectorAll('.editor__toolbar-row').length, 0)
    assert.ok(root.querySelector('.editor__toolbar-group'))
  })
})
