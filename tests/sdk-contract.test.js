/**
 * @file Tests for sdk-contract.
 */

import './helpers/dom.js'
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import * as sdk from '../src/sdk/index.js'
import { defineTheme } from '../src/sdk/define-theme.js'
import { createPluginServices } from '../src/sdk/services/create-services.js'
import { createPluginUi } from '../src/sdk/ui/index.js'

describe('sdk/index.js — public contract (@baselab/plugin-sdk)', () => {
  it('exports factories for defining plugin/theme', () => {
    assert.equal(typeof sdk.definePlugin, 'function')
    assert.equal(typeof sdk.defineTheme, 'function')
  })

  it('exports capability helpers used by plugins', () => {
    for (const name of [
      'mark', 'block', 'command', 'toolbarItem', 'shortcut', 'theme',
      'toolbarSeparator', 'statusbarItem', 'sidebarPanel', 'contextMenuItem',
      'contextMenu', 'selectionMenu', 'inspectorPanel', 'overlay',
    ]) {
      assert.equal(typeof sdk[name], 'function', `sdk.${name} should be a function`)
    }
  })

  it('exports pure operations used in custom command handlers', () => {
    for (const name of [
      'toggleMark', 'setMarkAttr', 'clearMarkAttr', 'insertText',
      'insertBlock', 'insertBlocks', 'setBlockType', 'deleteBlockAt',
    ]) {
      assert.equal(typeof sdk[name], 'function', `sdk.${name} should be a function`)
    }
  })

  it('exports shortcut utilities', () => {
    for (const name of ['parseShortcut', 'matchesShortcut', 'formatShortcut']) {
      assert.equal(typeof sdk[name], 'function', `sdk.${name} should be a function`)
    }
  })

  it('does not leak private symbols from core/ui (only documented surface)', () => {
    const allowed = new Set([
      'definePlugin', 'defineTheme', 'mark', 'block', 'command', 'toolbarItem',
      'shortcut', 'theme', 'toolbarSeparator', 'statusbarItem', 'sidebarPanel',
      'contextMenuItem', 'contextMenu', 'selectionMenu', 'inspectorPanel', 'overlay',
      'toggleMark', 'setMarkAttr', 'clearMarkAttr', 'insertText', 'insertBlock',
      'insertBlocks', 'setBlockType', 'deleteBlockAt', 'parseShortcut',
      'matchesShortcut', 'formatShortcut',
    ])
    const actual = Object.keys(sdk)
    for (const key of actual) {
      assert.ok(allowed.has(key), `unexpected export in public SDK: "${key}"`)
    }
  })
})

describe('defineTheme', () => {
  it('returns definition when id and label are present', () => {
    const def = defineTheme({ id: 'ocean', label: 'Ocean' })
    assert.deepEqual(def, { id: 'ocean', label: 'Ocean' })
  })

  it('throws error when "id" is missing', () => {
    assert.throws(() => defineTheme({ label: 'No id' }), /"id" is required/)
  })

  it('throws error when "label" is missing', () => {
    assert.throws(() => defineTheme({ id: 'ocean' }), /"label" is required/)
  })

  it('defineTheme only passes first argument — (id, label) form of theme() helper is not accessible via defineTheme', () => {
    assert.throws(() => defineTheme('ocean', 'Ocean'), /"label" is required/)
  })
})

describe('sdk/services — less exercised namespaces', () => {
  function createServices(overrides = {}) {
    return createPluginServices({
      pluginId: 'bold',
      getState: () => ({ doc: { type: 'doc', content: [] }, selection: { anchor: { block: 0, offset: 2 }, focus: { block: 0, offset: 2 } } }),
      getActiveMarks: () => [],
      getCursor: () => ({}),
      setSelection: () => {},
      canUndo: () => false,
      canRedo: () => false,
      undo: () => {},
      redo: () => {},
      sanitizeHtml: (html) => html.replace(/<script[^>]*>.*?<\/script>/gi, ''),
      focusEditor: mock.fn(),
      getZoom: () => 100,
      getPane: () => document.createElement('div'),
      getOverlayRoot: () => document.createElement('div'),
      uiRuntime: { registerOverlay: mock.fn(), openDialog: mock.fn(), closeDialog: mock.fn(), openPopover: mock.fn(), closePopover: mock.fn() },
      getAppearance: () => 'light',
      setAppearance: () => {},
      toggleAppearance: () => 'dark',
      subscribeAppearance: () => () => {},
      getTheme: () => 'padrao',
      setTheme: () => {},
      themeRoot: document.createElement('div'),
      assetsRegistry: { bold: { icons: { bold: 'icons/bold.svg' } } },
      registerShortcut: mock.fn(() => () => {}),
      execCommand: mock.fn(() => true),
      listCommands: () => ['bold', 'italic'],
      getHTML: () => '<p>x</p>',
      setContent: mock.fn(),
      refresh: mock.fn(),
      ...overrides,
    })
  }

  it('selection.isCollapsed reflects non-collapsed selection', () => {
    const services = createServices({
      getState: () => ({ doc: { type: 'doc', content: [] }, selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 3 } } }),
    })
    assert.equal(services.selection.isCollapsed(), false)
  })

  it('clipboard.sanitize delegates to received sanitizeHtml function', () => {
    const services = createServices()
    assert.equal(services.clipboard.sanitize('<script>x</script>ok'), 'ok')
  })

  it('focus.focusEditor calls the received callback', () => {
    const focusEditor = mock.fn()
    const services = createServices({ focusEditor })
    services.focus.focusEditor()
    assert.equal(focusEditor.mock.callCount(), 1)
  })

  it('shortcuts.register delegates to registerShortcut and returns cleanup', () => {
    const registerShortcut = mock.fn(() => () => {})
    const services = createServices({ registerShortcut })
    const cleanup = services.shortcuts.register('mod+k', () => {})
    assert.equal(registerShortcut.mock.callCount(), 1)
    assert.equal(typeof cleanup, 'function')
  })

  it('commands.list exposes list of available commands', () => {
    const services = createServices()
    assert.deepEqual(services.commands.list(), ['bold', 'italic'])
  })

  it('assets.resolve finds asset by pluginId + name and uses resolvePluginAssetUrl', () => {
    const services = createServices()
    const url = services.assets.resolve('bold', 'bold')
    assert.ok(url.includes('icons/bold.svg'))
  })

  it('assets.resolve returns null when plugin has no registered assets', () => {
    const services = createServices()
    assert.equal(services.assets.resolve('unknown-plugin', 'x'), null)
  })

  it('appearance.toggle delegates to toggleAppearance', () => {
    const services = createServices()
    assert.equal(services.appearance.toggle(), 'dark')
  })

  it('theme.getTheme/setTheme delegate to received callbacks', () => {
    const setTheme = mock.fn()
    const services = createServices({ setTheme })
    assert.equal(services.theme.getTheme(), 'padrao')
    services.theme.setTheme('escuro')
    assert.equal(setTheme.mock.callCount(), 1)
  })

  it('overlay.register registers in uiRuntime with correct pluginId', () => {
    const uiRuntime = { registerOverlay: mock.fn(), closePopover: mock.fn() }
    const services = createServices({ uiRuntime })
    services.overlay.register({ id: 'popover-1' })
    assert.equal(uiRuntime.registerOverlay.mock.calls[0].arguments[0], 'bold')
  })
})

describe('sdk/ui — createPluginUi', () => {
  it('creates a DesignSystem with expected component factories', () => {
    const ui = createPluginUi({
      t: (key) => key,
      pluginId: 'bold',
      uiRuntime: { registerOverlay: () => {}, mountSlot: () => {} },
      resolveAsset: () => null,
    })

    for (const name of ['createButton', 'createToggleButton', 'createIcon', 'Button', 'IconButton', 'Toggle', 'RichSelect']) {
      assert.equal(typeof ui[name], 'function', `ui.${name} should be a function`)
    }
  })
})
