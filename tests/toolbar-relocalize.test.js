/**
 * @file Tests for toolbar-relocalize.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Toolbar } from '../src/ui/toolbar/toolbar.js'
import { createPluginUi } from '../src/sdk/ui/create-plugin-ui.js'
import { PluginUiRuntime } from '../src/ui/runtime/index.js'

const ICON_SUN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3.5"/></svg>'
const ICON_MOON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a6 6 0 1 0 6 6 4 4 0 0 1-6-6z"/></svg>'

describe('Toolbar relocalize', () => {
  it('preserves icons when relocalizing items with inline icon', () => {
    const root = document.createElement('div')
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

    const ui = createPluginUi({
      t: (key) => (key === 'appearance-toggle.button' ? 'Toggle appearance' : key),
      pluginId: 'appearance-toggle',
      uiRuntime,
      resolveAsset: () => null,
    })

    const button = ui.createToolbarItem({
      id: 'appearance-toggle',
      label: 'appearance-toggle.button',
      title: 'appearance-toggle.title',
      icon: ICON_SUN,
      activeIcon: ICON_MOON,
      iconClass: 'sun',
      activeIconClass: 'moon',
    })

    const toolbar = new Toolbar({
      root,
      entries: [
        {
          type: 'item',
          item: {
            id: 'appearance-toggle',
            label: 'appearance-toggle.button',
            title: 'appearance-toggle.title',
            icon: ICON_SUN,
            activeIcon: ICON_MOON,
            iconClass: 'sun',
            activeIconClass: 'moon',
          },
          pluginId: 'appearance-toggle',
          ctx: { getMode: () => 'editor', ui },
          group: 'view',
          order: 5,
        },
      ],
      t: (key) => (key === 'appearance-toggle.button' ? 'Toggle appearance' : key),
    })

    assert.equal(button.querySelectorAll('.editor__icon svg').length, 2)

    toolbar.relocalize((key) =>
      key === 'appearance-toggle.button' ? 'Toggle appearance' : key,
    )

    assert.equal(button.querySelectorAll('.editor__icon svg').length, 2)
    assert.equal(button.textContent.trim(), '')
    assert.ok(button.getAttribute('aria-label'))
  })
})
