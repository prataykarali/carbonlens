import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildImpact } from '../src/data/carbon.js'
import { buildReductionPlan } from '../src/services/reductionPlan.js'

describe('personalized reduction plan', () => {
  it('targets the highest-impact item and dominant category', () => {
    const impact = buildImpact([
      { name: 'paneer', quantity: 0.5, unit: 'kg' },
      { name: 'bus ride', quantity: 8, unit: 'km' },
      { name: 'phone charge', quantity: 4, unit: 'item' },
    ])
    const plan = buildReductionPlan({ impact, history: [{ date: 'Mon', total: 4.5 }], carbonBudget: 3, city: 'Kolkata' })

    assert.equal(plan.topItem.name, 'paneer')
    assert.equal(plan.topCategory.category, 'food')
    assert.match(plan.headline, /paneer/)
    assert.match(plan.cityContext, /Kolkata/)
    assert.equal(plan.actions.length, 3)
  })

  it('uses personal history to calculate target gap and best-day action', () => {
    const impact = buildImpact([{ name: 'taxi', quantity: 8, unit: 'km' }])
    const plan = buildReductionPlan({
      impact,
      carbonBudget: 2,
      history: [
        { label: 'Mon', total: 4 },
        { label: 'Tue', total: 1.5 },
        { label: 'Wed', total: 3.5 },
      ],
    })

    assert.equal(plan.weeklyAverage, 3)
    assert.equal(plan.dailyGap, 1)
    assert.match(plan.actions[2].title, /Tue/)
    assert.ok(plan.projectedWeekSavings > 0)
  })
})
