import './helpers/dom.js'
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  AppearanceManager,
  normalizeAppearance,
  resolveLegacyAppearance,
  STORAGE_KEY,
} from '../src/ui/appearance/index.js'

describe('AppearanceManager', () => {
  /** @type {HTMLElement} */
  let root

  beforeEach(() => {
    root = document.createElement('div')
    root.className = 'editor'
    document.body.appendChild(root)
    localStorage.clear()
  })

  afterEach(() => {
    root.remove()
    localStorage.clear()
  })

  it('normalizes invalid values to light', () => {
    assert.equal(normalizeAppearance('invalid'), 'light')
    assert.equal(normalizeAppearance(null), 'light')
    assert.equal(normalizeAppearance('dark'), 'dark')
  })

  it('applies data-appearance to root', () => {
    const manager = new AppearanceManager({ root, initial: 'dark', persist: false })
    assert.equal(root.dataset.appearance, 'dark')
    assert.equal(manager.getAppearance(), 'dark')
  })

  it('persists choice in localStorage', () => {
    const manager = new AppearanceManager({ root, persist: true })
    manager.setAppearance('dark')
    assert.equal(localStorage.getItem(STORAGE_KEY), 'dark')

    const restored = new AppearanceManager({ root, persist: true })
    assert.equal(restored.getAppearance(), 'dark')
  })

  it('toggle switches between light and dark', () => {
    const manager = new AppearanceManager({ root, initial: 'light', persist: false })
    manager.toggleAppearance()
    assert.equal(manager.getAppearance(), 'dark')
    manager.toggleAppearance()
    assert.equal(manager.getAppearance(), 'light')
  })

  it('notifies subscribers when appearance changes', () => {
    const manager = new AppearanceManager({ root, initial: 'light', persist: false })
    /** @type {('light' | 'dark')[]} */
    const calls = []
    const unsub = manager.subscribe((mode) => calls.push(mode))

    manager.setAppearance('dark')
    assert.deepEqual(calls, ['dark'])

    unsub()
    manager.setAppearance('light')
    assert.deepEqual(calls, ['dark'])
  })

  it('migrates editor-theme dark to appearance dark', () => {
    localStorage.setItem('editor-theme', 'escuro')
    assert.equal(resolveLegacyAppearance(), 'dark')

    const manager = new AppearanceManager({ root, persist: true })
    assert.equal(manager.getAppearance(), 'dark')
  })
})
