/**
 * @file Tests for editor-orchestration.
 */

import './helpers/dom.js'
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTextarea, resolveRoot } from '../src/editor/lifecycle.js'
import { dispatchOperation } from '../src/editor/dispatch.js'
import { handleEditorContextMenu } from '../src/editor/events.js'
import { refreshEditorUi } from '../src/editor/refresh.js'
import { createToolbarItemPluginMap, getFilteredToolbarEntries } from '../src/editor/toolbar.js'
import {
  importHtmlSource,
  handleHtmlSourceKeyDown,
  applyEditorMode,
} from '../src/editor/html-mode.js'
import { mark } from '../src/sdk/helpers.js'
import { createEditorPluginContext } from '../src/editor/plugin-context.js'
import { History } from '../src/core/history/history.js'
import { createTestRegistries } from './helpers/fixtures.js'

describe('editor/lifecycle', () => {
  it('resolveTextarea returns element itself when already textarea', () => {
    const el = document.createElement('textarea')
    assert.equal(resolveTextarea(el), el)
  })

  it('resolveTextarea resolves by CSS selector', () => {
    const el = document.createElement('textarea')
    el.id = 'my-textarea'
    document.body.appendChild(el)
    assert.equal(resolveTextarea('#my-textarea'), el)
  })

  it('resolveTextarea throws error when selector does not resolve to textarea', () => {
    assert.throws(() => resolveTextarea('#does-not-exist'), /Textarea not found/)
  })

  it('resolveRoot creates div and appends to body when no root is passed', () => {
    const before = document.body.children.length
    const root = resolveRoot(undefined)
    assert.ok(root instanceof HTMLElement)
    assert.equal(document.body.children.length, before + 1)
  })

  it('resolveRoot resolves by CSS selector', () => {
    const el = document.createElement('div')
    el.id = 'my-root'
    document.body.appendChild(el)
    assert.equal(resolveRoot('#my-root'), el)
  })

  it('resolveRoot throws error when selector does not resolve to element', () => {
    assert.throws(() => resolveRoot('#missing-root'), /Root element not found/)
  })

  it('resolveRoot returns element itself when already HTMLElement', () => {
    const el = document.createElement('div')
    assert.equal(resolveRoot(el), el)
  })
})

describe('editor/dispatch', () => {
  it('writes transaction and applies new state when operation changes state', () => {
    const before = {
      doc: { type: 'doc', content: [] },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
    }
    const after = {
      doc: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
      selection: before.selection,
    }
    const history = new History()
    const applyState = mock.fn()

    dispatchOperation(
      { getState: () => before, registries: {}, history, applyState },
      () => after,
      []
    )

    assert.equal(applyState.mock.callCount(), 1)
    assert.deepEqual(applyState.mock.calls[0].arguments[0], after)
    assert.equal(history.canUndo(), true)
  })

  it('does not write transaction or apply state when before === after (statesEqual)', () => {
    const state = {
      doc: { type: 'doc', content: [] },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
    }
    const history = new History()
    const applyState = mock.fn()

    dispatchOperation({ getState: () => state, registries: {}, history, applyState }, (s) => s, [])

    assert.equal(applyState.mock.callCount(), 0)
    assert.equal(history.canUndo(), false)
  })

  it('forwards extra arguments to the operation', () => {
    const state = {
      doc: { type: 'doc', content: [] },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
    }
    const history = new History()
    const operation = mock.fn((s, _registries, text) => ({
      ...s,
      doc: { ...s.doc, content: [text] },
    }))

    dispatchOperation(
      { getState: () => state, registries: { r: 1 }, history, applyState: () => {} },
      operation,
      ['hello']
    )

    assert.equal(operation.mock.calls[0].arguments[2], 'hello')
    assert.equal(operation.mock.calls[0].arguments[1].r, 1)
  })
})

describe('editor/events (context menu)', () => {
  it('does nothing when no context menu defs are registered', () => {
    const event = new MouseEvent('contextmenu', { clientX: 10, clientY: 10 })
    const preventDefault = mock.method(event, 'preventDefault')

    handleEditorContextMenu(event, {
      plugins: { getContextMenuDefs: () => [] },
      pluginContexts: new Map(),
      pluginUiRuntime: { registerOverlay: mock.fn() },
    })

    assert.equal(preventDefault.mock.callCount(), 0)
  })

  it('prevents default and registers overlay when there are menu items', () => {
    const event = new MouseEvent('contextmenu', { clientX: 5, clientY: 7 })
    const registerOverlay = mock.fn()
    const ctx = { t: (k) => k }

    handleEditorContextMenu(event, {
      plugins: {
        getContextMenuDefs: () => [{ pluginId: 'p1', def: { items: [{ id: 'a', label: 'A' }] } }],
        getPluginContext: () => ctx,
      },
      pluginContexts: new Map([['p1', ctx]]),
      pluginUiRuntime: { registerOverlay },
    })

    assert.equal(registerOverlay.mock.callCount(), 1)
    assert.equal(registerOverlay.mock.calls[0].arguments[0], 'context')
  })
})

describe('editor/refresh', () => {
  it('refreshEditorUi only refreshes toolbar, modes and statusbar', () => {
    const calls = []
    const toolbar = {
      relocalize: () => calls.push('toolbar.relocalize'),
      refresh: () => calls.push('toolbar.refresh'),
    }
    const modes = {
      relocalize: () => calls.push('modes.relocalize'),
      refresh: () => calls.push('modes.refresh'),
    }
    const statusbar = {
      relocalize: () => calls.push('statusbar.relocalize'),
      refresh: () => calls.push('statusbar.refresh'),
    }

    refreshEditorUi({ toolbar, modes, statusbar })

    assert.deepEqual(calls, ['toolbar.refresh', 'statusbar.refresh', 'modes.refresh'])
  })
})

describe('editor/toolbar', () => {
  it('createToolbarItemPluginMap maps toolbar item id → plugin id', () => {
    const plugins = [
      { id: 'bold', capabilities: { toolbar: [{ id: 'bold', type: 'item' }] } },
      { id: 'italic', capabilities: { toolbar: [{ id: 'italic', type: 'item' }] } },
      { id: 'no-toolbar', capabilities: {} },
    ]

    const map = createToolbarItemPluginMap(plugins)
    assert.equal(map.get('bold'), 'bold')
    assert.equal(map.get('italic'), 'italic')
    assert.equal(map.size, 2)
  })

  it('createToolbarItemPluginMap ignores separators (no id)', () => {
    const plugins = [
      { id: 'hr', capabilities: { toolbar: [{ type: 'separator' }, { id: 'hr', type: 'item' }] } },
    ]
    const map = createToolbarItemPluginMap(plugins)
    assert.equal(map.size, 1)
    assert.equal(map.get('hr'), 'hr')
  })

  it('getFilteredToolbarEntries without layout returns all entries in one line', () => {
    const entries = [
      { type: 'item', item: { id: 'bold' } },
      { type: 'item', item: { id: 'italic' } },
    ]
    const plugins = { getToolbarEntries: () => entries }

    const result = getFilteredToolbarEntries({ plugins, layout: [], itemPluginMap: new Map() })
    assert.deepEqual(result, [entries])
  })

  it('getFilteredToolbarEntries with layout filters and orders by preset sequence', () => {
    const entries = [
      { type: 'item', item: { id: 'italic' }, group: 'format', order: 0 },
      { type: 'item', item: { id: 'bold' }, group: 'format', order: 1 },
    ]
    const plugins = { getToolbarEntries: () => entries }

    const result = getFilteredToolbarEntries({
      plugins,
      layout: [['bold', '|', 'italic']],
      itemPluginMap: new Map(),
    })

    assert.equal(result.length, 1)
    assert.equal(result[0].length, 3)
    assert.equal(result[0][0].item.id, 'bold')
    assert.equal(result[0][1].type, 'separator')
    assert.equal(result[0][2].item.id, 'italic')
  })

  it('getFilteredToolbarEntries with multi-line layout filters each line independently', () => {
    const entries = [
      { type: 'item', item: { id: 'bold' }, group: 'format', order: 0 },
      { type: 'item', item: { id: 'italic' }, group: 'format', order: 1 },
      { type: 'item', item: { id: 'underline' }, group: 'format', order: 2 },
    ]
    const plugins = { getToolbarEntries: () => entries }

    const result = getFilteredToolbarEntries({
      plugins,
      layout: [['bold', 'italic'], ['underline']],
      itemPluginMap: new Map(),
    })

    assert.equal(result.length, 2)
    assert.equal(result[0].length, 2)
    assert.equal(result[0][0].item.id, 'bold')
    assert.equal(result[0][1].item.id, 'italic')
    assert.equal(result[1].length, 1)
    assert.equal(result[1][0].item.id, 'underline')
  })
})

describe('editor/html-mode', () => {
  it('importHtmlSource: invalid HTML sets error and does not apply state', () => {
    const registries = createTestRegistries()
    const htmlSource = document.createElement('textarea')
    htmlSource.value = '<strong><unclosed'
    const applyState = mock.fn()
    const setHtmlError = mock.fn()

    const ok = importHtmlSource({
      htmlSource,
      registries,
      getState: () => ({ doc: { type: 'doc', content: [] }, selection: {} }),
      history: new History(),
      parseHtml: () => ({ type: 'doc', content: [] }),
      applyState,
      setHtmlError,
      refreshUi: () => {},
    })

    assert.equal(ok, false)
    assert.equal(applyState.mock.callCount(), 0)
    assert.equal(setHtmlError.mock.callCount(), 1)
    assert.ok(htmlSource.classList.contains('is-invalid'))
  })

  it('importHtmlSource: valid HTML writes transaction and applies new state', () => {
    const registries = createTestRegistries()
    const htmlSource = document.createElement('textarea')
    htmlSource.value = '<p>ok</p>'
    htmlSource.selectionStart = 0
    htmlSource.selectionEnd = 0
    const applyState = mock.fn()
    const history = new History()

    const before = {
      doc: { type: 'doc', content: [] },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
    }
    const newDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ok' }] }],
    }

    const ok = importHtmlSource({
      htmlSource,
      registries,
      getState: () => before,
      history,
      parseHtml: () => newDoc,
      applyState,
      setHtmlError: () => {},
      refreshUi: () => {},
    })

    assert.equal(ok, true)
    assert.equal(applyState.mock.callCount(), 1)
    assert.equal(history.canUndo(), true)
  })

  it('handleHtmlSourceKeyDown ignores when mode is not html', () => {
    const undo = mock.fn()
    handleHtmlSourceKeyDown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }), {
      mode: 'editor',
      undo,
      redo: () => {},
    })
    assert.equal(undo.mock.callCount(), 0)
  })

  it('handleHtmlSourceKeyDown calls undo on mod+z and redo on mod+shift+z', () => {
    const undo = mock.fn()
    const redo = mock.fn()

    handleHtmlSourceKeyDown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }), {
      mode: 'html',
      undo,
      redo,
    })
    assert.equal(undo.mock.callCount(), 1)

    handleHtmlSourceKeyDown(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }),
      { mode: 'html', undo, redo }
    )
    assert.equal(redo.mock.callCount(), 1)

    handleHtmlSourceKeyDown(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }), {
      mode: 'html',
      undo,
      redo,
    })
    assert.equal(redo.mock.callCount(), 2)
  })

  it('handleHtmlSourceKeyDown ignores when no mod modifier', () => {
    const undo = mock.fn()
    handleHtmlSourceKeyDown(new KeyboardEvent('keydown', { key: 'z' }), {
      mode: 'html',
      undo,
      redo: () => {},
    })
    assert.equal(undo.mock.callCount(), 0)
  })

  it('applyEditorMode: editor mode shows surface, attaches inputController and focuses', () => {
    const surface = document.createElement('div')
    const htmlSource = document.createElement('textarea')
    const preview = document.createElement('div')
    const inputController = { attach: mock.fn(), detach: mock.fn() }
    document.body.appendChild(surface)

    applyEditorMode({
      mode: 'editor',
      surface,
      htmlSource,
      preview,
      inputController,
      textarea: document.createElement('textarea'),
      document: { toJSON: () => ({ type: 'doc', content: [] }) },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
      registries: createTestRegistries(),
      getHTML: () => '<p></p>',
      syncView: mock.fn(),
      refreshUi: mock.fn(),
      setHtmlError: () => {},
    })

    assert.equal(surface.hidden, false)
    assert.equal(htmlSource.hidden, true)
    assert.equal(preview.hidden, true)
    assert.equal(inputController.attach.mock.callCount(), 1)
  })

  it('applyEditorMode: view mode sanitizes and injects HTML into preview', () => {
    const surface = document.createElement('div')
    const htmlSource = document.createElement('textarea')
    const preview = document.createElement('div')
    const registries = createTestRegistries()

    applyEditorMode({
      mode: 'view',
      surface,
      htmlSource,
      preview,
      inputController: { attach: () => {}, detach: () => {} },
      textarea: document.createElement('textarea'),
      document: { toJSON: () => ({ type: 'doc', content: [] }) },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
      registries,
      getHTML: () => '<script>alert(1)</script><strong>x</strong>',
      syncView: () => {},
      refreshUi: () => {},
      setHtmlError: () => {},
    })

    assert.equal(preview.hidden, false)
    assert.ok(!preview.innerHTML.includes('<script'))
    assert.ok(preview.innerHTML.includes('<strong>x</strong>'))
  })

  it('applyEditorMode: view mode strips event handlers and unsafe URL schemes before reaching innerHTML', () => {
    const surface = document.createElement('div')
    const htmlSource = document.createElement('textarea')
    const preview = document.createElement('div')
    const registries = createTestRegistries()
    registries.marks.registerMark(
      mark('link', { tag: 'a', parseTags: ['a'], attrs: ['href'], priority: -1 })
    )

    applyEditorMode({
      mode: 'view',
      surface,
      htmlSource,
      preview,
      inputController: { attach: () => {}, detach: () => {} },
      textarea: document.createElement('textarea'),
      document: { toJSON: () => ({ type: 'doc', content: [] }) },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
      registries,
      getHTML: () =>
        '<strong onclick="alert(1)">x</strong><a href="data:text/html,<script>alert(1)</script>">y</a>',
      syncView: () => {},
      refreshUi: () => {},
      setHtmlError: () => {},
    })

    assert.ok(!preview.innerHTML.includes('onclick'))
    assert.ok(!preview.innerHTML.includes('data:'))
  })

  it('applyEditorMode: html mode populates textarea with serialized HTML', () => {
    const surface = document.createElement('div')
    const htmlSource = document.createElement('textarea')
    htmlSource.setSelectionRange = () => {}
    document.body.appendChild(htmlSource)
    const preview = document.createElement('div')

    applyEditorMode({
      mode: 'html',
      surface,
      htmlSource,
      preview,
      inputController: { attach: () => {}, detach: () => {} },
      textarea: document.createElement('textarea'),
      document: { toJSON: () => ({ type: 'doc', content: [] }) },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
      registries: createTestRegistries(),
      getHTML: () => '<p>abc</p>',
      syncView: () => {},
      refreshUi: () => {},
      setHtmlError: () => {},
    })

    assert.equal(htmlSource.hidden, false)
    assert.equal(htmlSource.value, '<p>abc</p>')
    assert.equal(htmlSource.readOnly, false)
  })
})

describe('editor/plugin-context', () => {
  function baseDeps(overrides = {}) {
    const subscribers = new Set()
    return {
      pluginId: 'bold',
      editorOptions: { locale: 'pt', foo: 'bar' },
      assetBaseUrl: '',
      assetsRegistry: {},
      registries: createTestRegistries(),
      i18n: { t: (key) => `t:${key}` },
      pane: document.createElement('div'),
      overlayRoot: document.createElement('div'),
      root: document.createElement('div'),
      surface: document.createElement('div'),
      pluginUiRuntime: {},
      appearanceManager: { getAppearance: () => 'light', subscribe: () => () => {} },
      themeManager: { getTheme: () => 'padrao' },
      dynamicShortcuts: new Map(),
      subscribers,
      getState: () => ({ doc: { type: 'doc', content: [] }, selection: {} }),
      getSelection: () => ({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } }),
      getMode: () => 'editor',
      getActiveMarks: () => [],
      getMarkAttr: () => null,
      execCommand: () => true,
      insertText: () => {},
      insertBlock: () => {},
      toggleMark: () => {},
      canUndo: () => false,
      canRedo: () => false,
      undo: () => {},
      redo: () => {},
      setAppearance: () => {},
      toggleAppearance: () => 'dark',
      setTheme: () => {},
      getHTML: () => '<p></p>',
      setContent: () => {},
      refresh: () => {},
      setSelection: () => {},
      getCursor: () => ({}),
      resolveAssetUrl: (path) => `/assets/${path}`,
      ...overrides,
    }
  }

  it('builds a PluginContext with getOption reading from editorOptions', () => {
    const ctx = createEditorPluginContext(baseDeps())
    assert.equal(ctx.getOption('foo'), 'bar')
    assert.equal(ctx.getOption('missing'), undefined)
  })

  it('t() delegates to i18n.t', () => {
    const ctx = createEditorPluginContext(baseDeps())
    assert.equal(ctx.t('bold.button'), 't:bold.button')
  })

  it('subscribe adds and cleanup function removes listener from Set', () => {
    const subscribers = new Set()
    const ctx = createEditorPluginContext(baseDeps({ subscribers }))
    const listener = () => {}

    const unsubscribe = ctx.subscribe(listener)
    assert.equal(subscribers.has(listener), true)

    unsubscribe()
    assert.equal(subscribers.has(listener), false)
  })

  it('services.shortcuts.register stores in dynamicShortcuts Map and returns cleanup', () => {
    const dynamicShortcuts = new Map()
    const ctx = createEditorPluginContext(baseDeps({ dynamicShortcuts }))

    const cleanup = ctx.services.shortcuts.register('mod+k', () => {})
    assert.equal(dynamicShortcuts.size, 1)
    cleanup()
    assert.equal(dynamicShortcuts.size, 0)
  })

  it('services.clipboard.sanitize uses real sanitizeHtml with editor registries', () => {
    const ctx = createEditorPluginContext(baseDeps())
    const out = ctx.services.clipboard.sanitize('<script>x</script><strong>ok</strong>')
    assert.ok(!out.includes('<script'))
    assert.ok(out.includes('<strong>ok</strong>'))
  })

  it('assets points to the received assetsRegistry', () => {
    const assetsRegistry = { bold: { icons: {} } }
    const ctx = createEditorPluginContext(baseDeps({ assetsRegistry }))
    assert.equal(ctx.assets, assetsRegistry)
  })
})
