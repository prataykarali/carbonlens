const knownPlaces = {
  kolkata: [22.5726, 88.3639],
  howrah: [22.5958, 88.2636],
  darjeeling: [27.041, 88.2663],
  digha: [21.6278, 87.5086],
  delhi: [28.6139, 77.209],
  jaipur: [26.9124, 75.7873],
  kashmir: [34.0837, 74.7973],
  srinagar: [34.0837, 74.7973],
  mumbai: [19.076, 72.8777],
  pune: [18.5204, 73.8567],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  mysore: [12.2958, 76.6394],
}

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const radius = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function parseCoordinateInput(input) {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null
  return [Number(match[1]), Number(match[2])]
}

export function getKnownPlace(input) {
  const normalized = input.toLowerCase().trim()
  return knownPlaces[normalized] || Object.entries(knownPlaces).find(([key]) => normalized.includes(key))?.[1] || null
}

export function estimateRouteDistance(origin, destination) {
  const originCoord = parseCoordinateInput(origin) || getKnownPlace(origin)
  const destinationCoord = parseCoordinateInput(destination) || getKnownPlace(destination)
  if (originCoord && destinationCoord) return Number((haversineKm(originCoord, destinationCoord) * 1.25).toFixed(1))

  const joined = `${origin} ${destination}`.toLowerCase()
  if (joined.includes('kolkata') && joined.includes('darjeeling')) return 620
  if (joined.includes('kolkata') && joined.includes('howrah')) return 7.2
  if (joined.includes('delhi') && joined.includes('jaipur')) return 280
  if (joined.includes('mumbai') && joined.includes('pune')) return 150
  if (joined.includes('bangalore') && joined.includes('mysore')) return 145

  const lengthScore = Math.max(origin.length, destination.length)
  return Math.max(8, Math.min(920, Math.round(lengthScore * 7.8)))
}

export function calculateRouteImpact(km, mode) {
  const factors = {
    car: 0.18,
    transit: 0.055,
    rail: 0.035,
    walk: 0,
    bike: 0,
  }
  return Number((km * (factors[mode] ?? factors.car)).toFixed(2))
}
