import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { calculateRouteImpact, estimateRouteDistance, getKnownPlace, parseCoordinateInput } from './routeMath.js'

const geocodeCache = new Map()

const modeProfiles = {
  car: 'driving',
  transit: 'driving',
  rail: 'driving',
  bike: 'cycling',
  walk: 'walking',
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

export { calculateRouteImpact, estimateRouteDistance }

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
    mapElement.replaceChildren()
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
