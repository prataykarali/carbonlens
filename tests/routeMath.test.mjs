import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calculateRouteImpact, estimateRouteDistance, getKnownPlace, parseCoordinateInput } from '../src/services/routeMath.js'

describe('route carbon math', () => {
  it('parses coordinate input for current-location routes', () => {
    assert.deepEqual(parseCoordinateInput('22.5726, 88.3639'), [22.5726, 88.3639])
    assert.equal(parseCoordinateInput('Kolkata'), null)
  })

  it('matches known places by exact or contained names', () => {
    assert.deepEqual(getKnownPlace('Kolkata'), [22.5726, 88.3639])
    assert.deepEqual(getKnownPlace('central Darjeeling station'), [27.041, 88.2663])
  })

  it('estimates realistic fallback distance for known city pairs', () => {
    assert.ok(estimateRouteDistance('Kolkata', 'Darjeeling') > 600)
    assert.ok(estimateRouteDistance('Kolkata', 'Darjeeling') < 640)
    assert.ok(estimateRouteDistance('Mumbai', 'Pune') > 140)
    assert.ok(estimateRouteDistance('Mumbai', 'Pune') < 160)
  })

  it('uses transport mode factors for route impact', () => {
    assert.equal(calculateRouteImpact(100, 'car'), 18)
    assert.equal(calculateRouteImpact(100, 'transit'), 5.5)
    assert.equal(calculateRouteImpact(100, 'rail'), 3.5)
    assert.equal(calculateRouteImpact(100, 'bike'), 0)
  })

  it('falls back to car factors for unknown modes', () => {
    assert.equal(calculateRouteImpact(42, 'spaceship'), 7.56)
  })
})
