/**
 * @file Tests for transactions.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cloneState, statesEqual } from '../src/core/transactions/state.js'
import { createTransaction } from '../src/core/transactions/transaction.js'
import { createTestRegistries, stateWithText } from './helpers/fixtures.js'

describe('transactions', () => {
  const registries = createTestRegistries()

  it('cloneState produces independent copy', () => {
    const state = stateWithText('teste', registries)
    const copy = cloneState(state)

    copy.doc.content[0].content[0].text = 'alterado'

    assert.equal(state.doc.content[0].content[0].text, 'teste')
    assert.notEqual(state.doc, copy.doc)
  })

  it('statesEqual detects equal states', () => {
    const a = stateWithText('igual', registries)
    const b = cloneState(a)

    assert.ok(statesEqual(a, b))
  })

  it('statesEqual detects difference in document', () => {
    const a = stateWithText('a', registries)
    const b = stateWithText('b', registries)

    assert.ok(!statesEqual(a, b))
  })

  it('createTransaction freezes before and after', () => {
    const before = stateWithText('antes', registries)
    const after = stateWithText('depois', registries)
    const tx = createTransaction(before, after)

    before.doc.content[0].content[0].text = 'mutado'

    assert.equal(tx.before.doc.content[0].content[0].text, 'antes')
    assert.equal(tx.after.doc.content[0].content[0].text, 'depois')
  })
})
