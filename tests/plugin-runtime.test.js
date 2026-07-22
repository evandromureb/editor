import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PluginRuntime } from '../src/core/plugins/runtime.js'
import { createEditorRegistries } from '../src/core/schema/editor-registries.js'
import { I18n } from '../src/core/i18n/index.js'
import { mark, command, toolbarItem, shortcut } from '../src/sdk/helpers.js'
import { definePlugin } from '../src/sdk/define-plugin.js'

const boldPlugin = definePlugin({
  id: 'bold',
  name: 'Bold',
  capabilities: {
    marks: [mark('bold', { tag: 'strong', parseTags: ['strong', 'b'] })],
    commands: { bold: command.toggleMark('bold') },
    toolbar: [toolbarItem({ id: 'bold', label: 'bold.button', shortcut: 'mod+b', activeMark: 'bold' })],
    shortcuts: shortcut('mod+b', 'bold'),
    i18n: { pt: { 'bold.button': 'N' } },
  },
})

/** @type {import('../src/sdk/types.js').PluginContext} */
const mockCtx = {
  getState: () => ({ doc: { type: 'doc', content: [] }, selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } } }),
  selection: () => ({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } }),
  getMode: () => 'editor',
  getActiveMarks: () => [],
  execCommand: () => true,
  insertText: () => {},
  insertBlock: () => {},
  toggleMark: () => {},
  subscribe: () => () => {},
  t: (key) => key,
  ui: {},
  services: {},
  assets: {},
}

describe('PluginRuntime', () => {
  function createRuntime() {
    const registries = createEditorRegistries()
    const i18n = new I18n({ locale: 'pt' })
    const runtime = new PluginRuntime({ registries, i18n })
    return { runtime, registries, i18n }
  }

  it('registers marks, commands, toolbar and shortcuts', () => {
    const { runtime, registries } = createRuntime()

    runtime.register(boldPlugin, mockCtx)

    assert.ok(registries.marks.getMarkByName('bold'))
    assert.ok(registries.commands.getCommand('bold'))
    assert.equal(runtime.getToolbarItems().length, 1)
    assert.deepEqual(runtime.getShortcuts(), { 'mod+b': 'bold' })
  })

  it('rejects duplicate plugin', () => {
    const { runtime } = createRuntime()
    runtime.register(boldPlugin, mockCtx)

    assert.throws(() => runtime.register(boldPlugin, mockCtx), /Plugin already registered/)
  })

  it('unregister removes toolbar, shortcuts and schema from plugin', () => {
    const { runtime, registries } = createRuntime()
    runtime.register(boldPlugin, mockCtx)

    runtime.unregister('bold')

    assert.ok(!runtime.has('bold'))
    assert.equal(runtime.getToolbarEntries().length, 0)
    assert.deepEqual(runtime.getShortcuts(), {})
    assert.equal(registries.marks.getMarkByName('bold'), null)
    assert.equal(registries.commands.getCommand('bold'), null)
  })

  it('registers plugin i18n', () => {
    const { runtime, i18n } = createRuntime()
    runtime.register(boldPlugin, mockCtx)

    assert.equal(i18n.t('bold.button'), 'N')
  })

  it('getBlocks returns blocks from instance registry', () => {
    const { runtime } = createRuntime()
    runtime.register(boldPlugin, mockCtx)

    const types = runtime.getBlocks().map((b) => b.type)
    assert.ok(types.includes('paragraph'))
  })
})
