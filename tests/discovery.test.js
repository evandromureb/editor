/**
 * @file Tests for discovery.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execPath } from 'node:process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('discovery', () => {
  it('discover runs without error and generates registries', () => {
    const result = spawnSync(execPath, ['scripts/discover.js'], {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
    })

    assert.equal(result.status, 0, result.stderr)

    const pluginsRegistry = join(root, 'src/generated/plugins.registry.js')
    const themesRegistry = join(root, 'src/generated/themes.registry.js')
    const assetsRegistry = join(root, 'src/generated/assets.registry.js')

    assert.ok(existsSync(pluginsRegistry))
    assert.ok(existsSync(themesRegistry))
    assert.ok(existsSync(assetsRegistry))

    const pluginsContent = readFileSync(pluginsRegistry, 'utf8')
    assert.match(pluginsContent, /discoveredPlugins/)
    assert.match(pluginsContent, /plugin_bullet_list/)
    assert.match(pluginsContent, /plugin_bold/)
    assert.match(pluginsContent, /plugin_hr/)
  })

  it('discover generates aggregated CSS for plugins and themes', () => {
    const result = spawnSync(execPath, ['scripts/discover.js'], {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
    })

    assert.equal(result.status, 0, result.stderr)

    assert.ok(existsSync(join(root, 'src/generated/plugins.css')))
    assert.ok(existsSync(join(root, 'src/generated/themes.css')))
  })
})
