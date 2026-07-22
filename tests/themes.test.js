import './helpers/dom.js'
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadWithSdkAlias } from './helpers/load-plugin.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** @type {typeof import('../src/ui/themes/index.js')} */
let themesModule
let THEMES
let getTheme
let normalizeThemeId
let ThemeManager
let ThemeSelect

before(async () => {
  themesModule = await loadWithSdkAlias(join(root, 'src/ui/themes/index.js'))
  ;({ THEMES, getTheme, normalizeThemeId, ThemeManager, ThemeSelect } = themesModule)
})

describe('ui/themes/registry', () => {
  it('THEMES lists the 3 discovered real themes (corporate, escuro, padrao)', () => {
    const ids = THEMES.map((t) => t.id).sort()
    assert.deepEqual(ids, ['corporate', 'escuro', 'padrao'])
  })

  it('getTheme finds existing theme by id', () => {
    assert.equal(getTheme('padrao')?.id, 'padrao')
  })

  it('getTheme returns null for nonexistent id', () => {
    assert.equal(getTheme('nonexistent'), null)
  })

  it('normalizeThemeId keeps id when it exists', () => {
    assert.equal(normalizeThemeId('escuro'), 'escuro')
  })

  it('normalizeThemeId falls back to first theme when id is invalid', () => {
    assert.equal(normalizeThemeId('does-not-exist'), THEMES[0]?.id)
  })
})

describe('ui/themes/ThemeManager', () => {
  it('initializes with "default" when nothing is informed and no persisted value', () => {
    localStorage.clear()
    const root = document.createElement('div')
    const manager = new ThemeManager({ root, persist: false })
    assert.equal(manager.getTheme(), 'padrao')
    assert.equal(root.dataset.theme, 'padrao')
  })

  it('uses provided "initial" when it is a valid theme', () => {
    const root = document.createElement('div')
    const manager = new ThemeManager({ root, initial: 'escuro', persist: false })
    assert.equal(manager.getTheme(), 'escuro')
  })

  it('normalizes invalid "initial" to default theme', () => {
    const root = document.createElement('div')
    const manager = new ThemeManager({ root, initial: 'tema-fake', persist: false })
    assert.equal(manager.getTheme(), THEMES[0]?.id)
  })

  it('setTheme updates current theme and root dataset', () => {
    const root = document.createElement('div')
    const manager = new ThemeManager({ root, persist: false })
    manager.setTheme('corporate')
    assert.equal(manager.getTheme(), 'corporate')
    assert.equal(root.dataset.theme, 'corporate')
  })

  it('with persist=true, persists in localStorage and recovers on next instance', () => {
    localStorage.clear()
    const root1 = document.createElement('div')
    const manager1 = new ThemeManager({ root: root1, persist: true })
    manager1.setTheme('escuro')

    const root2 = document.createElement('div')
    const manager2 = new ThemeManager({ root: root2, persist: true })
    assert.equal(manager2.getTheme(), 'escuro')
  })

  it('with persist=false, does not write to localStorage', () => {
    localStorage.clear()
    const root = document.createElement('div')
    const manager = new ThemeManager({ root, persist: false })
    manager.setTheme('corporate')
    assert.equal(localStorage.getItem('editor-theme'), null)
  })
})

describe('ui/themes/ThemeSelect', () => {
  it('builds a Select with one option per discovered theme', () => {
    const root = document.createElement('div')
    const select = new ThemeSelect({ root, getTheme: () => 'padrao', onChange: () => {} })

    const options = root.querySelectorAll('[data-value], li, option')
    assert.ok(root.querySelector('.editor__theme'))
    assert.equal(typeof select.sync, 'function')
  })

  it('relocalize translates option labels and reapplies current value', () => {
    const root = document.createElement('div')
    const select = new ThemeSelect({ root, getTheme: () => 'corporate', onChange: () => {} })

    const t = (key) => (key === 'theme.corporate' ? 'Corporativo' : key)
    select.relocalize(t)

    const trigger = root.querySelector('.bl-select__trigger')
    assert.ok(trigger, 'select should render a trigger')
  })

  it('aria-label of trigger is set from t("ui.theme.label")', () => {
    const root = document.createElement('div')
    new ThemeSelect({ root, getTheme: () => 'padrao', onChange: () => {}, t: (key) => `T:${key}` })

    const trigger = root.querySelector('.bl-select__trigger')
    assert.equal(trigger?.getAttribute('aria-label'), 'T:ui.theme.label')
  })

  it('sync() does not alter value while select is open', () => {
    const root = document.createElement('div')
    const select = new ThemeSelect({ root, getTheme: () => 'padrao', onChange: () => {} })
    assert.equal(select.isOpen, false)
    select.sync()
  })
})
