import { createReadStream, existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

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

function sendJson(response, body, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  })
  response.end(JSON.stringify(body))
}

function pickFoodImage(query) {
  const lowered = query.toLowerCase()
  const key = Object.keys(imageFallbacks).find((entry) => lowered.includes(entry))
  return imageFallbacks[key] || '/assets/imag5.jpeg'
}

async function serveFile(response, filePath) {
  if (!existsSync(filePath)) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
  })
  createReadStream(filePath).pipe(response)
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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

  const safePath = normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, '')
  const staticPath = safePath === '/' ? '/index.html' : safePath
  const filePath = join(distDir, staticPath)

  if (existsSync(filePath)) {
    await serveFile(response, filePath)
    return
  }

  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  response.end(await readFile(join(distDir, 'index.html'), 'utf8'))
})

server.listen(port, '0.0.0.0', () => {
  console.log(`CarbonLens Space server listening on ${port}`)
})
