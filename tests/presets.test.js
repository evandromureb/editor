/**
 * @file Tests for presets.
 */

import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { PresetRegistry } from '../src/core/presets/PresetRegistry.js'
import { resolveEditorConfig } from '../src/core/presets/resolve-config.js'
import '../src/core/presets/index.js'

// O preset 'corporate' declara plugins: ['bold', 'italic', 'underline'].
// resolveEditorConfig precisa do 2º argumento (defaults.discoveredPlugins)
// to resolve these IDs to PluginDefinition — without it, each ID is
// treated as "not found" and a console.warn is emitted (noisy,
// but it is not a failure: covers exactly the real behavior when a
// preset references a plugin that was not loaded).
const stubDiscoveredPlugins = ['bold', 'italic', 'underline'].map((id) => ({
  id,
  name: id,
  capabilities: {},
}))

describe('presets', () => {
  it('loads registered default presets', () => {
    assert.equal(PresetRegistry.has('default'), true)
    assert.equal(PresetRegistry.has('corporate'), true)
    assert.equal(PresetRegistry.has('minimalist'), true)
  })

  it('respects priority Defaults → Preset → User Config', () => {
    const resolved = resolveEditorConfig(
      { preset: 'corporate', height: 800 },
      { discoveredPlugins: stubDiscoveredPlugins },
    )

    assert.equal(resolved.locale, 'es')
    assert.equal(resolved.theme, 'corporate')
    assert.equal(resolved.width, 1024)
    assert.equal(resolved.height, 800)
    assert.equal(resolved.responsive, true)
    assert.deepEqual(resolved.toolbar, [['bold', 'italic', '|', 'underline']])
    assert.deepEqual(resolved.plugins.map((p) => p.id), ['bold', 'italic', 'underline'])
  })

  it('allows overriding individual properties', () => {
    const resolved = resolveEditorConfig(
      { preset: 'corporate', theme: 'padrao', locale: 'pt' },
      { discoveredPlugins: stubDiscoveredPlugins },
    )

    assert.equal(resolved.theme, 'padrao')
    assert.equal(resolved.locale, 'pt')
  })

  it('emits console.warn and ignores preset plugins that were not discovered', () => {
    const warn = mock.method(console, 'warn', () => {})
    try {
      const resolved = resolveEditorConfig({ preset: 'corporate' }, { discoveredPlugins: [] })
      assert.deepEqual(resolved.plugins, [])
      assert.equal(warn.mock.callCount(), 3)
      assert.match(warn.mock.calls[0].arguments[0], /Plugin "bold" not found/)
    } finally {
      warn.mock.restore()
    }
  })

  it('preset registration and removal work', () => {
    PresetRegistry.register('temp', { locale: 'en', theme: 'padrao' })
    assert.equal(PresetRegistry.has('temp'), true)
    assert.equal(PresetRegistry.get('temp')?.locale, 'en')

    assert.equal(PresetRegistry.remove('temp'), true)
    assert.equal(PresetRegistry.has('temp'), false)
  })

  it('throws error for unknown preset', () => {
    assert.throws(() => resolveEditorConfig({ preset: 'missing' }), /Unknown editor preset/)
  })
})
