/**
 * @file Tests for editor shell DOM structure.
 */

import './helpers/dom.js'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createEditorShell } from '../src/ui/shell.js'

describe('ui/shell', () => {
  it('creates scroll tracks for toolbar and statusbar', () => {
    const root = document.createElement('div')
    const shell = createEditorShell(root)

    assert.ok(root.querySelector('.editor__toolbar-scroll.editor__scroll-x'))
    assert.ok(root.querySelector('.editor__toolbar-track'))
    assert.ok(root.querySelector('.editor__statusbar-scroll.editor__scroll-x'))
    assert.ok(root.querySelector('.editor__statusbar-track'))
    assert.ok(root.querySelector('.editor__sidebar-backdrop'))
    assert.equal(shell.toolbar.className, 'editor__toolbar-track')
    assert.ok(shell.statusbarLeft.parentElement?.classList.contains('editor__statusbar-track'))
  })
})
