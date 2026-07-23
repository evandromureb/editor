/**
 * @file Tests for modes-statusbar.
 */

import './helpers/dom.js'
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { Modes } from '../src/ui/modes/modes.js'
import { ZoomControl } from '../src/ui/statusbar/zoom.js'
import { computeStats, computeHtmlStats } from '../src/ui/statusbar/stats.js'
import { docNode, paragraphNode, textNode } from '../src/core/document/nodes.js'

describe('ui/modes/Modes', () => {
  it('renders one button per mode (editor, html, view)', () => {
    const root = document.createElement('div')
    new Modes({ root, onChange: () => {}, getMode: () => 'editor' })

    const buttons = root.querySelectorAll('.editor__mode-btn')
    assert.equal(buttons.length, 3)
    assert.deepEqual(
      [...buttons].map((b) => b.dataset.mode),
      ['editor', 'html', 'view']
    )
  })

  it('marks current mode button as is-active after refresh()', () => {
    let currentMode = 'editor'
    const root = document.createElement('div')
    const modes = new Modes({ root, onChange: () => {}, getMode: () => currentMode })

    const htmlBtn = root.querySelector('[data-mode=html]')
    assert.equal(htmlBtn.classList.contains('is-active'), false)

    currentMode = 'html'
    modes.refresh()
    assert.equal(htmlBtn.classList.contains('is-active'), true)
    assert.equal(root.querySelector('[data-mode=editor]').classList.contains('is-active'), false)
  })

  it('clicking button triggers onChange with mode id', () => {
    const onChange = mock.fn()
    const root = document.createElement('div')
    new Modes({ root, onChange, getMode: () => 'editor' })

    root.querySelector('[data-mode=view]').dispatchEvent(new MouseEvent('click'))
    assert.equal(onChange.mock.callCount(), 1)
    assert.equal(onChange.mock.calls[0].arguments[0], 'view')
  })

  it('relocalize translates button text via labelKey', () => {
    const root = document.createElement('div')
    const modes = new Modes({ root, onChange: () => {}, getMode: () => 'editor' })

    modes.relocalize((key) => `T:${key}`)
    assert.equal(root.querySelector('[data-mode=editor]').textContent, 'T:ui.mode.editor')
    assert.equal(root.querySelector('[data-mode=html]').textContent, 'T:ui.mode.html')
  })
})

describe('ui/statusbar/ZoomControl', () => {
  it('starts at 100% and applies --editor-zoom to target', () => {
    const root = document.createElement('div')
    const target = document.createElement('div')
    const zoom = new ZoomControl({ root, target })

    assert.equal(zoom.getValue(), 100)
    assert.equal(target.style.getPropertyValue('--editor-zoom'), '1')
    assert.equal(root.querySelector('.editor__zoom-value').textContent, '100%')
  })

  it('button "+" increments by 10 up to ceiling of 200', () => {
    const root = document.createElement('div')
    const target = document.createElement('div')
    const zoom = new ZoomControl({ root, target })

    for (let i = 0; i < 15; i++) {
      root.querySelectorAll('.editor__zoom-btn')[1].dispatchEvent(new MouseEvent('click'))
    }

    assert.equal(zoom.getValue(), 200)
  })

  it('button "-" decrements by 10 down to floor of 50', () => {
    const root = document.createElement('div')
    const target = document.createElement('div')
    const zoom = new ZoomControl({ root, target })

    for (let i = 0; i < 15; i++) {
      root.querySelectorAll('.editor__zoom-btn')[0].dispatchEvent(new MouseEvent('click'))
    }

    assert.equal(zoom.getValue(), 50)
  })

  it('onChange is called with new value on each apply()', () => {
    const onChange = mock.fn()
    const root = document.createElement('div')
    const target = document.createElement('div')
    new ZoomControl({ root, target, onChange })

    assert.equal(onChange.mock.callCount(), 1)
    assert.equal(onChange.mock.calls[0].arguments[0], 100)

    root.querySelectorAll('.editor__zoom-btn')[1].dispatchEvent(new MouseEvent('click'))
    assert.equal(onChange.mock.callCount(), 2)
    assert.equal(onChange.mock.calls[1].arguments[0], 110)
  })

  it('relocalize updates aria-labels for +/- buttons', () => {
    const root = document.createElement('div')
    const target = document.createElement('div')
    const zoom = new ZoomControl({ root, target })

    zoom.relocalize((key) => `T:${key}`)
    const [minus, plus] = root.querySelectorAll('.editor__zoom-btn')
    assert.equal(minus.getAttribute('aria-label'), 'T:ui.zoom.decrease')
    assert.equal(plus.getAttribute('aria-label'), 'T:ui.zoom.increase')
  })
})

describe('ui/statusbar/stats', () => {
  it('computeStats counts document words/chars and identifies current block', () => {
    const doc = docNode([
      paragraphNode([textNode('ola mundo')]),
      paragraphNode([textNode('outro paragrafo aqui')]),
    ])
    const selection = { anchor: { block: 1, offset: 0 }, focus: { block: 1, offset: 0 } }

    const stats = computeStats(doc, selection, 'P')
    assert.equal(stats.block, 'P 2')
    assert.equal(stats.words, 5)
    assert.ok(stats.chars > 0)
  })

  it('computeStats with empty document returns 0 words', () => {
    const doc = docNode([paragraphNode([textNode('')])])
    const selection = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } }

    const stats = computeStats(doc, selection)
    assert.equal(stats.words, 0)
    assert.equal(stats.chars, 0)
  })

  it('computeHtmlStats strips HTML tags before counting words/chars', () => {
    const stats = computeHtmlStats('<p>ola <strong>mundo</strong> teste</p>')
    assert.equal(stats.words, 3)
    assert.equal(stats.block, 'P —')
  })

  it('computeHtmlStats with empty HTML returns 0 words', () => {
    const stats = computeHtmlStats('')
    assert.equal(stats.words, 0)
    assert.equal(stats.chars, 0)
  })
})
