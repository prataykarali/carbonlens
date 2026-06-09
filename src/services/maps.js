import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const geocodeCache = new Map()

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

const modeProfiles = {
  car: 'driving',
  transit: 'driving',
  rail: 'driving',
  bike: 'cycling',
  walk: 'walking',
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

function parseCoordinateInput(input) {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null
  return [Number(match[1]), Number(match[2])]
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

function getKnownPlace(input) {
  const normalized = input.toLowerCase().trim()
  return knownPlaces[normalized] || Object.entries(knownPlaces).find(([key]) => normalized.includes(key))?.[1] || null
}

async function geocode(query) {
  const coordinateInput = parseCoordinateInput(query)
  if (coordinateInput) return coordinateInput

  const known = getKnownPlace(query)
  if (known) return known

  const cacheKey = query.toLowerCase().trim()
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )
  if (!response.ok) throw new Error(`Nominatim geocode failed ${response.status}`)
  const data = await response.json()
  if (!data[0]) throw new Error(`Place not found: ${query}`)

  const coords = [Number(data[0].lat), Number(data[0].lon)]
  geocodeCache.set(cacheKey, coords)
  return coords
}

async function routeWithOsrm(originCoords, destinationCoords, mode) {
  const profile = modeProfiles[mode] || 'driving'
  const url = `https://router.project-osrm.org/route/v1/${profile}/${originCoords[1]},${originCoords[0]};${destinationCoords[1]},${destinationCoords[0]}?overview=full&geometries=geojson`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`OSRM route failed ${response.status}`)
  const data = await response.json()
  const route = data.routes?.[0]
  if (!route) throw new Error('OSRM route unavailable')

  return {
    km: Number((route.distance / 1000).toFixed(1)),
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  }
}

function createMarkerIcon(className) {
  return L.divIcon({
    className: `carbon-marker ${className}`,
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export function renderOpenRouteMap({ mapElement }) {
  if (!mapElement) return null

  if (mapElement._leaflet_id) {
    mapElement._leaflet_id = null
    mapElement.innerHTML = ''
  }

  const map = L.map(mapElement, {
    zoomControl: false,
    attributionControl: true,
  }).setView([22.5726, 88.3639], 6)

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  requestAnimationFrame(() => map.invalidateSize())
  setTimeout(() => map.invalidateSize(), 140)

  let routeLayer = null
  let markers = []
  let userMarker = null

  return {
    map,
    async route(origin, destination, mode = 'car') {
      const [originCoords, destinationCoords] = await Promise.all([geocode(origin), geocode(destination)])
      const route = await routeWithOsrm(originCoords, destinationCoords, mode)

      if (routeLayer) routeLayer.remove()
      markers.forEach((marker) => marker.remove())

      routeLayer = L.layerGroup([
        L.polyline(route.coordinates, {
          color: '#ffffff',
          weight: 11,
          opacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round',
        }),
        L.polyline(route.coordinates, {
          color: '#008f61',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      ]).addTo(map)

      markers = [
        L.marker(originCoords, { icon: createMarkerIcon('origin') }).addTo(map),
        L.marker(destinationCoords, { icon: createMarkerIcon('destination') }).addTo(map),
      ]

      map.fitBounds(L.latLngBounds(route.coordinates), { padding: [56, 56] })
      setTimeout(() => map.invalidateSize(), 60)
      return route.km
    },
    locate(coords) {
      if (!coords) return
      map.setView([coords.lat, coords.lng], 12)
      if (userMarker) userMarker.remove()
      userMarker = L.marker([coords.lat, coords.lng], { icon: createMarkerIcon('user') }).addTo(map)
      setTimeout(() => map.invalidateSize(), 60)
    },
    destroy() {
      map.remove()
    },
  }
}
