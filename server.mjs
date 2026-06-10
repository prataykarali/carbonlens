import { createReadStream, existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(root, 'dist')
const port = Number(process.env.PORT || 7860)

const articleFallbacks = [
  {
    title: 'Food choices are the fastest carbon lever most people control',
    description: 'CarbonLens highlights the highest-impact swap instead of making users optimize every item.',
    source: 'CarbonLens brief',
    url: 'https://ourworldindata.org/environmental-impacts-of-food',
  },
  {
    title: 'Short-trip routing can change daily transport emissions',
    description: 'Distance, vehicle type, and shared transit make a visible difference when the route is concrete.',
    source: 'CarbonLens brief',
    url: 'https://ourworldindata.org/co2-emissions-from-transport',
  },
  {
    title: 'Energy feedback works when it maps to familiar appliances',
    description: 'A fan, AC hour, or phone charge is easier to act on than an abstract kilogram value.',
    source: 'CarbonLens brief',
    url: 'https://ourworldindata.org/energy',
  },
]

const imageFallbacks = {
  paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80',
  samosa: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
  banana: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=80',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
  idli: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80',
  dal: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80',
  chana: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
  oats: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=80',
  biryani: 'https://images.unsplash.com/photo-1633945274309-2c16c9682a8b?auto=format&fit=crop&w=900&q=80',
}

const usageState = {
  users: new Set(),
  days: new Map(),
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.riv': 'application/octet-stream',
  '.svg': 'image/svg+xml',
}

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://world.openfoodfacts.org https://nominatim.openstreetmap.org https://router.project-osrm.org https://*.tile.openstreetmap.org https://*.openstreetmap.org",
    "worker-src 'self' blob:",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function sendJson(response, body, status = 200) {
  response.writeHead(status, {
    ...securityHeaders,
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(body))
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 4096) request.destroy()
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        resolve({})
      }
    })
    request.on('error', () => resolve({}))
  })
}

function summarizeUsage() {
  const days = [...usageState.days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-14)
    .map(([date, row]) => ({
      date,
      visits: row.visits || 0,
      entries: row.entries || 0,
      scans: row.scans || 0,
      routes: row.routes || 0,
      diets: row.diets || 0,
      total_kg: Number((row.totalKg || 0).toFixed(2)),
      unique_users: row.users.size,
    }))

  return {
    unique_users: usageState.users.size,
    days,
    privacy: 'Stores hashed random browser IDs, event counts, dates, and CO2e totals only.',
  }
}

function recordUsage({ anonymous_id: anonymousId, event_type: eventType = 'visit', total_kg: totalKg = 0 }) {
  if (!anonymousId || String(anonymousId).length < 8) return summarizeUsage()

  const today = new Date().toISOString().slice(0, 10)
  const allowedEvents = new Set(['visit', 'scans', 'routes', 'diets'])
  const safeEvent = allowedEvents.has(eventType) ? eventType : 'scans'
  const userHash = createHash('sha256').update(String(anonymousId)).digest('hex').slice(0, 32)
  const day = usageState.days.get(today) || {
    visits: 0,
    entries: 0,
    scans: 0,
    routes: 0,
    diets: 0,
    totalKg: 0,
    users: new Set(),
  }

  usageState.users.add(userHash)
  day.users.add(userHash)

  if (safeEvent === 'visit') {
    day.visits += 1
  } else {
    day.entries += 1
    day[safeEvent] += 1
    day.totalKg += Math.min(100000, Math.max(0, Number(totalKg) || 0))
  }

  usageState.days.set(today, day)
  return summarizeUsage()
}

function pickFoodImage(query) {
  const lowered = query.toLowerCase().slice(0, 80)
  const key = Object.keys(imageFallbacks).find((entry) => lowered.includes(entry))
  return imageFallbacks[key] || '/assets/imag5.jpeg'
}

function cacheControlFor(filePath) {
  if (extname(filePath) === '.html') return 'no-store'
  if (filePath.includes('/assets/')) return 'public, max-age=31536000, immutable'
  return 'public, max-age=3600'
}

async function serveFile(response, filePath) {
  if (!existsSync(filePath)) {
    response.writeHead(404, {
      ...securityHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    ...securityHeaders,
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': cacheControlFor(filePath),
  })
  createReadStream(filePath).pipe(response)
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...securityHeaders,
      ...corsHeaders,
    })
    response.end()
    return
  }

  if (requestUrl.pathname === '/api/health') {
    sendJson(response, {
      ok: true,
      host: 'hugging-face-space',
      maps_stack: 'leaflet-openstreetmap-osrm-nominatim',
      media: {
        toxic_rive: existsSync(join(distDir, 'assets/toxic.riv')),
      },
    })
    return
  }

  if (requestUrl.pathname === '/api/articles') {
    sendJson(response, { articles: articleFallbacks })
    return
  }

  if (requestUrl.pathname === '/api/food-image') {
    const query = requestUrl.searchParams.get('query') || ''
    sendJson(response, { query, image_url: pickFoodImage(query) })
    return
  }

  if (requestUrl.pathname === '/api/usage-event' && request.method === 'POST') {
    const body = await readJsonBody(request)
    sendJson(response, recordUsage(body))
    return
  }

  const safePath = normalize(decodeURIComponent(requestUrl.pathname))
    .replace(/^(\.\.([/\\]|$))+/, '')
    .replace(/^[/\\]+/, '/')
  const staticPath = safePath === '/' ? '/index.html' : safePath
  const filePath = join(distDir, staticPath)

  if (existsSync(filePath)) {
    await serveFile(response, filePath)
    return
  }

  response.writeHead(200, {
    ...securityHeaders,
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(await readFile(join(distDir, 'index.html'), 'utf8'))
})

server.listen(port, '0.0.0.0', () => {
  console.log(`CarbonLens Space server listening on ${port}`)
})
