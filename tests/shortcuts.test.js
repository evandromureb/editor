/**
 * @file Tests for shortcuts.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseShortcut, matchesShortcut, formatShortcut } from '../src/core/shortcuts/shortcuts.js'

describe('shortcuts', () => {
  describe('parseShortcut', () => {
    it('recognizes mod as alias for ctrl/cmd', () => {
      assert.deepEqual(parseShortcut('mod+b'), { mod: true, shift: false, alt: false, key: 'b' })
    })

    it('recognizes ctrl and cmd explicitly as mod', () => {
      assert.equal(parseShortcut('ctrl+k').mod, true)
      assert.equal(parseShortcut('cmd+k').mod, true)
    })

    it('recognizes shift', () => {
      assert.deepEqual(parseShortcut('mod+shift+z'), {
        mod: true,
        shift: true,
        alt: false,
        key: 'z',
      })
    })

    it('recognizes alt and option as aliases', () => {
      assert.equal(parseShortcut('alt+f').alt, true)
      assert.equal(parseShortcut('option+f').alt, true)
    })

    it('normalizes to lowercase', () => {
      assert.equal(parseShortcut('MOD+B').key, 'b')
      assert.equal(parseShortcut('MOD+B').mod, true)
    })

    it('last part is always final key, even for symbols', () => {
      assert.equal(parseShortcut('mod+shift+=').key, '=')
    })

    // Fixed: split('+') would break 'mod+shift++' into ['mod','shift','',''],
    // leaving the final key empty instead of '+'. parseShortcut now recognizes
    // the '++' suffix as the literal '+' key (used by plugins/superscript).
    it('recognizes literal "+" key when shortcut ends with "++"', () => {
      assert.deepEqual(parseShortcut('mod+shift++'), {
        mod: true,
        shift: true,
        alt: false,
        key: '+',
      })
    })

    it('recognizes "+" shortcut alone without modifiers', () => {
      assert.deepEqual(parseShortcut('+'), { mod: false, shift: false, alt: false, key: '+' })
    })

    it('recognizes "mod++" as mod + literal "+" key', () => {
      assert.deepEqual(parseShortcut('mod++'), { mod: true, shift: false, alt: false, key: '+' })
    })

    it('without modifiers returns all false', () => {
      assert.deepEqual(parseShortcut('escape'), {
        mod: false,
        shift: false,
        alt: false,
        key: 'escape',
      })
    })
  })

  describe('matchesShortcut', () => {
    function keyEvent({ key, ctrlKey = false, metaKey = false, shiftKey = false, altKey = false }) {
      return { key, ctrlKey, metaKey, shiftKey, altKey }
    }

    it('matches event with ctrlKey for mod+b', () => {
      assert.equal(matchesShortcut(keyEvent({ key: 'b', ctrlKey: true }), 'mod+b'), true)
    })

    it('matches event with metaKey for mod+b (mac)', () => {
      assert.equal(matchesShortcut(keyEvent({ key: 'b', metaKey: true }), 'mod+b'), true)
    })

    it('does not match if shift modifier is missing', () => {
      assert.equal(matchesShortcut(keyEvent({ key: 'z', ctrlKey: true }), 'mod+shift+z'), false)
    })

    it('does not match if unexpected shift modifier is present', () => {
      assert.equal(
        matchesShortcut(keyEvent({ key: 'b', ctrlKey: true, shiftKey: true }), 'mod+b'),
        false
      )
    })

    it('does not match if key is different', () => {
      assert.equal(matchesShortcut(keyEvent({ key: 'i', ctrlKey: true }), 'mod+b'), false)
    })

    it('key comparison is case-insensitive', () => {
      assert.equal(matchesShortcut(keyEvent({ key: 'B', ctrlKey: true }), 'mod+b'), true)
    })

    it('does not match when no modifier is pressed but shortcut requires mod', () => {
      assert.equal(matchesShortcut(keyEvent({ key: 'b' }), 'mod+b'), false)
    })

    it('matches shortcut without modifiers (e.g. escape)', () => {
      assert.equal(matchesShortcut(keyEvent({ key: 'Escape' }), 'escape'), true)
    })

    it('matches superscript alternate shortcut (mod+shift++) with real "+" key', () => {
      assert.equal(
        matchesShortcut(keyEvent({ key: '+', ctrlKey: true, shiftKey: true }), 'mod+shift++'),
        true
      )
    })
  })

  describe('formatShortcut', () => {
    it('formats mod+shift+b for display', () => {
      assert.equal(formatShortcut('mod+shift+b'), 'Ctrl+Shift+B')
    })

    it('formats cmd and option as Ctrl/Alt', () => {
      assert.equal(formatShortcut('cmd+option+f'), 'Ctrl+Alt+F')
    })

    it('keeps non-modifier symbols in uppercase', () => {
      assert.equal(formatShortcut('mod+='), 'Ctrl+=')
    })
  })
})
