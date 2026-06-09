const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001'

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
  bananas: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=80',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
  idli: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80',
  dal: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80',
  chana: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
  oats: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=900&q=80',
  biryani: 'https://images.unsplash.com/photo-1633945274309-2c16c9682a8b?auto=format&fit=crop&w=900&q=80',
}

async function getJson(path) {
  const response = await fetch(`${BACKEND_URL}${path}`)
  if (!response.ok) throw new Error(`Backend error ${response.status}`)
  return response.json()
}

export async function fetchFoodImage(query) {
  try {
    const data = await getJson(`/api/food-image?query=${encodeURIComponent(query)}`)
    return data.image_url
  } catch {
    const key = Object.keys(imageFallbacks).find((entry) => query.toLowerCase().includes(entry))
    return imageFallbacks[key] || '/assets/imag5.jpeg'
  }
}

export async function fetchArticles() {
  try {
    const data = await getJson('/api/articles')
    return data.articles?.length ? data.articles : articleFallbacks
  } catch {
    return articleFallbacks
  }
}

export async function checkBackend() {
  try {
    return await getJson('/api/health')
  } catch {
    return { ok: false, maps_stack: 'offline' }
  }
}
