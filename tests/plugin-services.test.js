/**
 * @file Tests for plugin-services.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createPluginServices } from '../src/sdk/services/create-services.js'
import { PluginUiRuntime } from '../src/ui/runtime/index.js'

describe('PluginServices', () => {
  it('exposes facades without editor internals', () => {
    const overlayRoot = document.createElement('div')
    const pane = document.createElement('div')
    pane.style.setProperty('--editor-zoom', '1')

    const uiRuntime = new PluginUiRuntime({
      overlayRoot,
      slotContainers: {
        'statusbar-left': document.createElement('div'),
        'statusbar-center': document.createElement('div'),
        'statusbar-right': document.createElement('div'),
        sidebar: document.createElement('aside'),
        toolbar: document.createElement('header'),
      },
    })

    const themeRoot = document.createElement('div')
    themeRoot.style.setProperty('--editor-bg', '#fff')
    document.body.appendChild(themeRoot)

    const services = createPluginServices({
      pluginId: 'test',
      getState: () => ({
        doc: { type: 'doc', content: [] },
        selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
      }),
      getActiveMarks: () => [],
      canUndo: () => false,
      canRedo: () => false,
      undo: () => {},
      redo: () => {},
      sanitizeHtml: (html) => html,
      focusEditor: () => {},
      getZoom: () => 100,
      getPane: () => pane,
      uiRuntime,
      getAppearance: () => 'light',
      setAppearance: () => {},
      toggleAppearance: () => 'dark',
      subscribeAppearance: () => () => {},
      getTheme: () => 'padrao',
      setTheme: () => {},
      themeRoot,
      assetsRegistry: {
        bold: { icons: { bold: 'plugins/bold/icons/bold.svg' } },
      },
      assetBaseUrl: 'https://cdn.example.com',
      registerShortcut: () => () => {},
      execCommand: () => true,
      listCommands: () => ['bold'],
      getHTML: () => '<p></p>',
      setContent: () => {},
      refresh: () => {},
      setSelection: () => {},
      getCursor: () => ({
        anchor: { block: 0, offset: 0 },
        focus: { block: 0, offset: 0 },
        direction: 'none',
        isCollapsed: true,
        blockId: 0,
        offset: 0,
      }),
    })

    assert.equal(typeof services.selection.get, 'function')
    assert.equal(typeof services.selection.getCursor, 'function')
    assert.equal(typeof services.selection.set, 'function')
    assert.equal(typeof services.history.canUndo, 'function')
    assert.equal(typeof services.overlay.openDialog, 'function')
    assert.equal(typeof services.appearance.getAppearance, 'function')
    assert.equal(typeof services.appearance.toggle, 'function')
    assert.equal(services.appearance.getAppearance(), 'light')
    assert.equal(services.commands.list().includes('bold'), true)
    assert.equal(services.viewport.getZoom(), 100)
    assert.ok(services.selection.isCollapsed())
    assert.equal(
      services.assets.resolve('bold', 'bold'),
      'https://cdn.example.com/plugins/bold/icons/bold.svg'
    )
  })
})
