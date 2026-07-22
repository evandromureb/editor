import './helpers/dom.js'
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
    toolbar: [toolbarItem({ id: 'bold', label: 'bold.button', activeMark: 'bold' })],
    shortcuts: shortcut('mod+b', 'bold'),
  },
})

const italicPlugin = definePlugin({
  id: 'italic',
  name: 'Italic',
  capabilities: {
    marks: [mark('italic', { tag: 'em', parseTags: ['em', 'i'] })],
    commands: { italic: command.toggleMark('italic') },
    toolbar: [
      toolbarItem({
        id: 'italic',
        label: 'italic.button',
        isActive: (ctx) => ctx.getActiveMarks().includes('italic'),
      }),
    ],
  },
})

/** @type {import('../src/sdk/types.js').PluginContext} */
function createMockCtx(activeMarks = []) {
  return {
    getState: () => ({
      doc: { type: 'doc', content: [] },
      selection: { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } },
    }),
    selection: () => ({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } }),
    getMode: () => 'editor',
    getActiveMarks: () => activeMarks,
    execCommand: () => true,
    insertText: () => {},
    insertBlock: () => {},
    toggleMark: () => {},
    subscribe: () => () => {},
    t: (key) => key,
    ui: { createToolbarItem: () => document.createElement('button') },
    services: {},
    assets: {},
  }
}

describe('Toolbar context per plugin', () => {
  it('getToolbarEntries associates correct ctx to each plugin', () => {
    const registries = createEditorRegistries()
    const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })

    const boldCtx = createMockCtx(['bold'])
    const italicCtx = createMockCtx([])

    runtime.register(boldPlugin, boldCtx)
    runtime.register(italicPlugin, italicCtx)

    const entries = runtime.getToolbarEntries()
    const boldEntry = entries.find((e) => e.type === 'item' && e.item.id === 'bold')
    const italicEntry = entries.find((e) => e.type === 'item' && e.item.id === 'italic')

    assert.ok(boldEntry && boldEntry.type === 'item')
    assert.ok(italicEntry && italicEntry.type === 'item')
    assert.equal(boldEntry.ctx, boldCtx)
    assert.equal(italicEntry.ctx, italicCtx)
    assert.equal(boldEntry.item.isActive?.(boldEntry.ctx), true)
    assert.equal(italicEntry.item.isActive?.(italicEntry.ctx), false)
  })
})

describe('PluginRuntime complete unregister', () => {
  it('removes marks, commands and toolbar entries', () => {
    const registries = createEditorRegistries()
    const runtime = new PluginRuntime({ registries, i18n: new I18n({ locale: 'pt' }) })
    const ctx = createMockCtx()

    runtime.register(boldPlugin, ctx)
    assert.ok(registries.marks.getMarkByName('bold'))
    assert.ok(registries.commands.getCommand('bold'))

    runtime.unregister('bold')

    assert.equal(registries.marks.getMarkByName('bold'), null)
    assert.equal(registries.commands.getCommand('bold'), null)
    assert.equal(runtime.getToolbarEntries().length, 0)
  })
})
