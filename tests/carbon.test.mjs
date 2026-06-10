import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildImpact, estimateItemImpact, normalizeItemName, parseQuantity, pickAnchor } from '../src/data/carbon.js'

describe('carbon factor engine', () => {
  it('normalizes noisy item names for factor matching', () => {
    assert.equal(normalizeItemName('  Paneer!! Wrap  '), 'paneer wrap')
  })

  it('parses common quantity units from natural language', () => {
    assert.deepEqual(parseQuantity('500g paneer'), { quantity: 0.5, unit: 'kg', explicit: true })
    assert.deepEqual(parseQuantity('8km Uber ride'), { quantity: 8, unit: 'km', explicit: true })
    assert.deepEqual(parseQuantity('1.5l milk'), { quantity: 1.5, unit: 'litre', explicit: true })
  })

  it('uses configured default portions when an amount is not explicit', () => {
    const paneer = estimateItemImpact({ name: 'paneer' })
    assert.equal(paneer.unit, 'kg')
    assert.equal(paneer.kg, 1.22)
  })

  it('honors explicit quantities over default portions', () => {
    const paneer = estimateItemImpact({ name: 'paneer', quantity: 0.5, unit: 'kg' })
    assert.equal(paneer.unit, 'kg')
    assert.equal(paneer.kg, 3.05)
  })

  it('aggregates category totals for mixed choices', () => {
    const impact = buildImpact([
      { name: '2 samosas', quantity: 2, unit: 'item' },
      { name: 'Uber ride', quantity: 8, unit: 'km' },
      { name: 'phone charge', quantity: 3, unit: 'item' },
    ])

    assert.equal(impact.totalKg, 1.95)
    assert.equal(impact.byCategory.food, 0.48)
    assert.equal(impact.byCategory.transport, 1.44)
    assert.equal(impact.byCategory.energy, 0.03)
  })

  it('selects a human-scale comparison anchor for the total', () => {
    assert.equal(pickAnchor(2.1).label, 'a Kolkata to Durgapur bus seat')
    assert.equal(pickAnchor(99).label, 'a week of evening AC use in a small room')
  })
})
