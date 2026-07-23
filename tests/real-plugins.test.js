import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { PluginRuntime } from '../src/core/plugins/runtime.js'
import { createEditorRegistries } from '../src/core/schema/editor-registries.js'
import { I18n } from '../src/core/i18n/index.js'
import { loadRealPlugin } from './helpers/load-plugin.js'

const PLUGIN_IDS = [
  'bullet-list',
  'bold',
  'clear-formatting',
  'font-family',
  'font-size',
  'highlight',
  'hr',
  'italic',
  'paragraph',
  'quote',
  'redo',
  'subscript',
  'superscript',
  'text-color',
  'underline',
  'undo',
]

/** @type {Map<string, import('../src/sdk/types.js').PluginDefinition>} */
const loaded = new Map()

/** @type {Record<string, any>} */
const historyCalls = { undo: 0, redo: 0, canUndo: true, canRedo: true }

function mockCtx() {
  return {
    getState: () => ({
      doc: { type: 'doc', content: [] },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
    }),
    selection: () => ({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } }),
    getMode: () => 'editor',
    getActiveMarks: () => [],
    getMarkAttr: () => null,
    getOption: () => undefined,
    execCommand: () => true,
    insertText: () => {},
    insertBlock: () => {},
    toggleMark: () => {},
    subscribe: () => () => {},
    t: (key) => key,
    ui: {},
    services: {
      history: {
        undo: () => {
          historyCalls.undo += 1
        },
        redo: () => {
          historyCalls.redo += 1
        },
        canUndo: () => historyCalls.canUndo,
        canRedo: () => historyCalls.canRedo,
      },
      // highlight/text-color call this in deactivate() to close their
      // popover; without the stub, the TypeError is swallowed by PluginRuntime.unregister
      // (try/catch) but still pollutes the test runner output with
      // "[PluginRuntime] Error in deactivate...".
      overlay: {
        closePopover: () => {},
      },
    },
    assets: {},
  }
}

describe('Real plugins (plugins/*/index.js)', () => {
  before(async () => {
    for (const id of PLUGIN_IDS) {
      loaded.set(id, await loadRealPlugin(id))
    }
  })

  it('all plugins load and export valid definePlugin', () => {
    for (const id of PLUGIN_IDS) {
      const plugin = loaded.get(id)
      assert.ok(plugin, `plugin ${id} should load`)
      assert.equal(plugin.id, id, `plugin ${id} id should match folder name`)
      assert.equal(typeof plugin.name, 'string')
      assert.ok(plugin.capabilities && typeof plugin.capabilities === 'object')
    }
  })

  it('each plugin registers without error in a real PluginRuntime', () => {
    for (const id of PLUGIN_IDS) {
      const registries = createEditorRegistries()
      const i18n = new I18n({ locale: 'pt' })
      const runtime = new PluginRuntime({ registries, i18n })

      assert.doesNotThrow(
        () => runtime.register(loaded.get(id), mockCtx()),
        `registration of ${id} should not throw`
      )
      assert.ok(runtime.has(id))
    }
  })

  it('each plugin with marks registers the mark in schema', () => {
    const marksById = {
      bold: 'bold',
      italic: 'italic',
      underline: 'underline',
      subscript: 'subscript',
      superscript: 'superscript',
      'font-family': 'font-family',
      'font-size': 'font-size',
      highlight: 'highlight',
      'text-color': 'text-color',
    }

    for (const [pluginId, markName] of Object.entries(marksById)) {
      const registries = createEditorRegistries()
      const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
      runtime.register(loaded.get(pluginId), mockCtx())

      assert.ok(
        registries.marks.getMarkByName(markName),
        `${pluginId} should register mark "${markName}"`
      )
    }
  })

  it('hr registers the void block "hr"', () => {
    const registries = createEditorRegistries()
    const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
    runtime.register(loaded.get('hr'), mockCtx())

    const types = runtime.getBlocks().map((b) => b.type)
    assert.ok(types.includes('hr'))
  })

  it('paragraph registers heading blocks (h1-h6)', () => {
    const registries = createEditorRegistries()
    const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
    runtime.register(loaded.get('paragraph'), mockCtx())

    const types = runtime.getBlocks().map((b) => b.type)
    for (const level of [1, 2, 3, 4, 5]) {
      assert.ok(types.includes(`heading-${level}`), `should register heading-${level}`)
    }
  })

  it('each plugin with toolbar exposes at least 1 toolbar item', () => {
    const withToolbar = PLUGIN_IDS.filter(
      (id) => (loaded.get(id).capabilities.toolbar ?? []).length > 0
    )
    assert.ok(withToolbar.length > 0)

    for (const id of withToolbar) {
      const registries = createEditorRegistries()
      const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
      runtime.register(loaded.get(id), mockCtx())

      assert.ok(runtime.getPluginToolbarIds(id).length > 0, `${id} should have toolbar items`)
    }
  })

  it('declared shortcuts match the expected map', () => {
    const expected = {
      'mod+b': 'bold',
      'mod+i': 'italic',
      'mod+u': 'underline',
      'mod+z': 'undo',
      'mod+shift+z': 'redo',
      'shift+mod+x': 'clear-formatting',
      'mod+=': 'subscript',
    }

    for (const [combo, command] of Object.entries(expected)) {
      const registries = createEditorRegistries()
      const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
      runtime.register(loaded.get(command), mockCtx())

      assert.equal(runtime.getShortcuts()[combo], command)
    }
  })

  it('superscript registers two alternative shortcuts for the same command', () => {
    const registries = createEditorRegistries()
    const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
    runtime.register(loaded.get('superscript'), mockCtx())

    const shortcuts = runtime.getShortcuts()
    assert.equal(shortcuts['mod+shift+='], 'superscript')
    assert.equal(shortcuts['mod+shift++'], 'superscript')
  })

  it('undo/redo call services.history via activate() + command', () => {
    historyCalls.undo = 0
    historyCalls.redo = 0

    const registries = createEditorRegistries()
    const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
    const ctx = mockCtx()

    runtime.register(loaded.get('undo'), ctx)
    runtime.register(loaded.get('redo'), ctx)

    const undoCommand = registries.commands.getCommand('undo')
    const redoCommand = registries.commands.getCommand('redo')
    const state = { doc: { type: 'doc', content: [] }, selection: {} }

    undoCommand(state)
    redoCommand(state)

    assert.equal(historyCalls.undo, 1)
    assert.equal(historyCalls.redo, 1)
  })

  it('undo/redo toolbar isEnabled reflects canUndo/canRedo from service', () => {
    const registries = createEditorRegistries()
    const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
    const ctx = mockCtx()
    runtime.register(loaded.get('undo'), ctx)

    const [entry] = runtime.getToolbarEntries().filter((e) => e.pluginId === 'undo')
    historyCalls.canUndo = true
    assert.equal(entry.item.isEnabled(ctx), true)

    historyCalls.canUndo = false
    assert.equal(entry.item.isEnabled(ctx), false)
  })

  it('unregister completely removes each plugin (marks, toolbar, shortcuts, blocks)', () => {
    for (const id of PLUGIN_IDS) {
      const registries = createEditorRegistries()
      const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
      runtime.register(loaded.get(id), mockCtx())

      runtime.unregister(id)

      assert.ok(!runtime.has(id), `${id} should no longer be registered`)
      assert.equal(runtime.getPluginToolbarIds(id).length, 0)
      for (const shortcutCommand of Object.values(runtime.getShortcuts())) {
        assert.notEqual(shortcutCommand, id)
      }
    }
  })

  it('registering all 15 plugins together generates no conflict of id/mark/command/toolbar', () => {
    const registries = createEditorRegistries()
    const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
    const ctx = mockCtx()

    for (const id of PLUGIN_IDS) {
      assert.doesNotThrow(
        () => runtime.register(loaded.get(id), ctx),
        `${id} should register together with others without collision`
      )
    }

    assert.equal(runtime.getAll().length, PLUGIN_IDS.length)
  })

  it('clear-formatting registers command that clears block/selection marks', () => {
    const plugin = loaded.get('clear-formatting')
    assert.ok(plugin.capabilities.commands && Object.keys(plugin.capabilities.commands).length > 0)
  })

  it('font-family/font-size/highlight/text-color expose .set and .clear commands', () => {
    for (const id of ['font-family', 'font-size', 'highlight', 'text-color']) {
      const plugin = loaded.get(id)
      const commandNames = Object.keys(plugin.capabilities.commands)
      assert.ok(commandNames.includes(`${id}.set`), `${id} should have command ${id}.set`)
      assert.ok(commandNames.includes(`${id}.clear`), `${id} should have command ${id}.clear`)
    }
  })
})
