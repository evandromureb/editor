/**
 * @file Tests for history.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { History } from '../src/core/history/history.js'
import { createTransaction } from '../src/core/transactions/transaction.js'
import { createTestRegistries, stateWithText } from './helpers/fixtures.js'

describe('history', () => {
  const registries = createTestRegistries()

  function tx(labelA, labelB) {
    return createTransaction(stateWithText(labelA, registries), stateWithText(labelB, registries))
  }

  it('record and undo return previous transaction', () => {
    const history = new History()
    const transaction = tx('a', 'b')

    history.record(transaction)

    assert.ok(history.canUndo())
    assert.equal(history.undo(), transaction)
    assert.ok(!history.canUndo())
  })

  it('redo restores undone transaction', () => {
    const history = new History()
    const transaction = tx('a', 'b')

    history.record(transaction)
    history.undo()
    history.pushRedo(transaction)

    assert.ok(history.canRedo())
    assert.equal(history.redo(), transaction)
  })

  it('new record clears redo stack', () => {
    const history = new History()
    history.record(tx('a', 'b'))
    history.undo()
    history.pushRedo(tx('a', 'b'))

    history.record(tx('b', 'c'))

    assert.ok(!history.canRedo())
  })

  it('respects undo stack limit', () => {
    const history = new History({ limit: 2 })

    history.record(tx('1', '2'))
    history.record(tx('2', '3'))
    history.record(tx('3', '4'))

    assert.equal(history.undo()?.before.doc.content[0].content[0].text, '3')
    assert.equal(history.undo()?.before.doc.content[0].content[0].text, '2')
    assert.equal(history.undo(), null)
  })
})
