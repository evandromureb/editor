/**
 * @file Tests for resolve-plugin-asset-url.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getDefaultAssetBaseUrl,
  resolvePluginAssetUrl,
} from '../src/ui/assets/resolve-plugin-asset-url.js'

describe('resolvePluginAssetUrl', () => {
  it('resolves relative path to module in src/', () => {
    const url = resolvePluginAssetUrl('plugins/bold/icons/bold.svg')
    assert.ok(url.includes('/plugins/bold/icons/bold.svg'))
    assert.ok(!url.includes('/demo/plugins/'))
  })

  it('respects explicit assetBaseUrl', () => {
    const url = resolvePluginAssetUrl(
      'plugins/bold/icons/bold.svg',
      'https://cdn.example.com/assets/'
    )
    assert.equal(url, 'https://cdn.example.com/assets/plugins/bold/icons/bold.svg')
  })

  it('getDefaultAssetBaseUrl returns string in test environment', () => {
    const base = getDefaultAssetBaseUrl()
    assert.equal(typeof base, 'string')
  })
})
