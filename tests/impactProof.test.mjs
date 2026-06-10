import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildImpact } from '../src/data/carbon.js'
import { buildImpactProofPayload, createImpactProof, toFelt252Hex } from '../src/services/impactProof.js'

const fixedDate = new Date('2026-06-10T12:00:00.000Z')

describe('impact proof generation', () => {
  it('builds a canonical privacy-preserving payload', () => {
    const impact = buildImpact([
      { name: 'paneer', quantity: 0.2, unit: 'kg' },
      { name: 'bus ride', quantity: 8, unit: 'km' },
    ])
    const payload = buildImpactProofPayload({ impact, source: 'test', createdAt: fixedDate })

    assert.equal(payload.app, 'CarbonLens')
    assert.equal(payload.source, 'test')
    assert.equal(payload.recorded_at, 1781092800)
    assert.equal(payload.total_grams_co2e, Math.round(impact.totalKg * 1000))
    assert.deepEqual(
      payload.categories.map((row) => row.category),
      [...payload.categories.map((row) => row.category)].sort(),
    )
  })

  it('converts hashes into felt252-sized hex values', () => {
    assert.equal(toFelt252Hex('0xabc'), '0xabc')
    assert.equal(toFelt252Hex('f'.repeat(64)).length, 64)
  })

  it('creates stable Cairo calldata for the same impact result', async () => {
    const impact = buildImpact([{ name: '2 samosas', quantity: 2, unit: 'item' }])
    const left = await createImpactProof({ impact, source: 'test', createdAt: fixedDate })
    const right = await createImpactProof({ impact, source: 'test', createdAt: fixedDate })

    assert.equal(left.proof_id, right.proof_id)
    assert.equal(left.category_fingerprint, right.category_fingerprint)
    assert.equal(left.cairo_calldata.length, 4)
    assert.equal(left.cairo_calldata[1], left.total_grams_co2e)
    assert.equal(left.cairo_calldata[3], left.recorded_at)
  })
})
