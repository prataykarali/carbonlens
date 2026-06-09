export const categoryColors = {
  food: '#0f9f6e',
  transport: '#2563eb',
  energy: '#f59e0b',
  shopping: '#e11d48',
}

export const anchorLibrary = [
  {
    maxKg: 0.12,
    label: 'phone fully charged 10 times',
    icon: 'BatteryCharging',
    cityHint: 'home',
  },
  {
    maxKg: 0.55,
    label: 'an auto-rickshaw from Esplanade to Howrah',
    icon: 'MapPinned',
    cityHint: 'Kolkata',
  },
  {
    maxKg: 1.2,
    label: 'a ceiling fan running for three straight days',
    icon: 'Fan',
    cityHint: 'home',
  },
  {
    maxKg: 2.6,
    label: 'a Kolkata to Durgapur bus seat',
    icon: 'Bus',
    cityHint: 'West Bengal',
  },
  {
    maxKg: 5.5,
    label: 'one hour of a coal-powered home',
    icon: 'Factory',
    cityHint: 'energy',
  },
  {
    maxKg: 11,
    label: 'your share of a Kolkata to Delhi flight',
    icon: 'Plane',
    cityHint: 'travel',
  },
  {
    maxKg: 30,
    label: 'a week of evening AC use in a small room',
    icon: 'Snowflake',
    cityHint: 'home',
  },
]

export const fallbackFactors = [
  { match: ['banana', 'fruit', 'apple', 'orange'], category: 'food', kgPerUnit: 0.08, unit: 'item' },
  { match: ['oats', 'porridge', 'muesli'], category: 'food', kgPerKg: 1.4, defaultKg: 0.08, unit: 'kg' },
  { match: ['rice', 'biryani', 'pulao'], category: 'food', kgPerKg: 2.7, defaultKg: 0.25, unit: 'kg' },
  { match: ['dal', 'lentil'], category: 'food', kgPerKg: 1.1, defaultKg: 0.22, unit: 'kg' },
  { match: ['chana', 'chickpea'], category: 'food', kgPerKg: 0.95, defaultKg: 0.2, unit: 'kg' },
  { match: ['dosa', 'idli', 'upma', 'poha'], category: 'food', kgPerUnit: 0.18, unit: 'item' },
  { match: ['samosa', 'kachori', 'snack'], category: 'food', kgPerUnit: 0.24, unit: 'item' },
  { match: ['paneer', 'cheese'], category: 'food', kgPerKg: 6.1, defaultKg: 0.2, unit: 'kg' },
  { match: ['milk', 'curd', 'yogurt'], category: 'food', kgPerLitre: 1.4, defaultLitre: 1, unit: 'litre' },
  { match: ['egg'], category: 'food', kgPerUnit: 0.27, unit: 'item' },
  { match: ['chicken'], category: 'food', kgPerKg: 6.9, defaultKg: 0.25, unit: 'kg' },
  { match: ['mutton', 'lamb'], category: 'food', kgPerKg: 20, defaultKg: 0.25, unit: 'kg' },
  { match: ['beef'], category: 'food', kgPerKg: 60, defaultKg: 0.2, unit: 'kg' },
  { match: ['coffee'], category: 'food', kgPerUnit: 0.21, unit: 'cup' },
  { match: ['tea', 'chai'], category: 'food', kgPerUnit: 0.08, unit: 'cup' },
  { match: ['chocolate'], category: 'food', kgPerKg: 18.7, defaultKg: 0.08, unit: 'kg' },
  { match: ['bread', 'roti', 'chapati'], category: 'food', kgPerUnit: 0.08, unit: 'item' },
  { match: ['uber', 'ola', 'taxi', 'cab'], category: 'transport', kgPerKm: 0.18, defaultKm: 5, unit: 'km' },
  { match: ['auto', 'rickshaw', 'toto'], category: 'transport', kgPerKm: 0.07, defaultKm: 4, unit: 'km' },
  { match: ['bus'], category: 'transport', kgPerKm: 0.04, defaultKm: 12, unit: 'km' },
  { match: ['metro', 'train'], category: 'transport', kgPerKm: 0.025, defaultKm: 10, unit: 'km' },
  { match: ['flight', 'plane'], category: 'transport', kgPerKm: 0.115, defaultKm: 1300, unit: 'km' },
  { match: ['fan'], category: 'energy', kgPerHour: 0.035, defaultHour: 8, unit: 'hour' },
  { match: ['ac', 'air conditioner'], category: 'energy', kgPerHour: 0.82, defaultHour: 2, unit: 'hour' },
  { match: ['phone', 'charge'], category: 'energy', kgPerUnit: 0.01, unit: 'charge' },
  { match: ['shirt', 'jeans', 'clothes'], category: 'shopping', kgPerUnit: 5.6, unit: 'item' },
  { match: ['plastic bottle'], category: 'shopping', kgPerUnit: 0.08, unit: 'item' },
]

export const demoReceiptItems = [
  { name: 'Organic bananas', quantity: 6, unit: 'item' },
  { name: 'Oat milk', quantity: 1, unit: 'litre' },
  { name: 'Coffee beans', quantity: 0.25, unit: 'kg' },
  { name: 'Paneer', quantity: 0.2, unit: 'kg' },
]

export const defaultHistory = [
  { date: 'Mon', total: 3.8, food: 2.4, transport: 0.8, energy: 0.4, shopping: 0.2 },
  { date: 'Tue', total: 2.1, food: 1.2, transport: 0.5, energy: 0.3, shopping: 0.1 },
  { date: 'Wed', total: 5.6, food: 3.5, transport: 1.1, energy: 0.6, shopping: 0.4 },
  { date: 'Thu', total: 1.9, food: 0.9, transport: 0.6, energy: 0.3, shopping: 0.1 },
  { date: 'Fri', total: 4.2, food: 2.8, transport: 0.9, energy: 0.3, shopping: 0.2 },
  { date: 'Sat', total: 2.7, food: 1.6, transport: 0.5, energy: 0.4, shopping: 0.2 },
  { date: 'Sun', total: 1.5, food: 0.8, transport: 0.3, energy: 0.3, shopping: 0.1 },
]

export function normalizeItemName(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseQuantity(text = '') {
  const lower = text.toLowerCase()
  const number = Number((lower.match(/(\d+(?:\.\d+)?)/) || [])[1] || 1)

  if (lower.includes('kg')) return { quantity: number, unit: 'kg' }
  if (lower.includes('g')) return { quantity: number / 1000, unit: 'kg' }
  if (lower.includes('km')) return { quantity: number, unit: 'km' }
  if (lower.includes('hour') || lower.includes('hr')) return { quantity: number, unit: 'hour' }
  if (lower.includes('litre') || lower.includes('liter') || lower.includes('l ')) {
    return { quantity: number, unit: 'litre' }
  }

  return { quantity: number, unit: 'item' }
}

export function estimateItemImpact(rawItem) {
  const name = normalizeItemName(rawItem.name || rawItem.text || '')
  const factor = fallbackFactors.find((entry) => entry.match.some((needle) => name.includes(needle)))
  const parsed = parseQuantity(`${rawItem.quantity || ''} ${rawItem.unit || ''} ${rawItem.name || rawItem.text || ''}`)
  const quantity = Number(rawItem.quantity) || parsed.quantity || 1
  const unit = rawItem.unit || parsed.unit

  if (!factor) {
    return {
      name: rawItem.name || rawItem.text || 'Unknown item',
      quantity,
      unit,
      category: 'shopping',
      kg: 0.42,
      source: 'static fallback',
    }
  }

  let kg = factor.kgPerUnit || 0
  if (unit === 'kg' || factor.kgPerKg) kg = (factor.kgPerKg || factor.kgPerUnit || 0.42) * (quantity || factor.defaultKg || 1)
  if (unit === 'litre' || factor.kgPerLitre) kg = (factor.kgPerLitre || factor.kgPerUnit || 0.42) * (quantity || factor.defaultLitre || 1)
  if (unit === 'km' || factor.kgPerKm) kg = (factor.kgPerKm || factor.kgPerUnit || 0.42) * (quantity || factor.defaultKm || 1)
  if (unit === 'hour' || factor.kgPerHour) kg = (factor.kgPerHour || factor.kgPerUnit || 0.42) * (quantity || factor.defaultHour || 1)
  if (unit === 'item' && factor.kgPerUnit) kg = factor.kgPerUnit * quantity

  return {
    name: rawItem.name || rawItem.text || factor.match[0],
    quantity,
    unit,
    category: factor.category,
    kg: Number(Math.max(0.01, kg).toFixed(2)),
    source: 'static fallback',
  }
}

export function buildImpact(rawItems = []) {
  const items = rawItems.map(estimateItemImpact)
  const totalKg = Number(items.reduce((sum, item) => sum + item.kg, 0).toFixed(2))
  const byCategory = items.reduce(
    (acc, item) => {
      acc[item.category] = Number(((acc[item.category] || 0) + item.kg).toFixed(2))
      return acc
    },
    { food: 0, transport: 0, energy: 0, shopping: 0 },
  )

  return { items, totalKg, byCategory }
}

export function pickAnchor(totalKg) {
  return anchorLibrary.find((anchor) => totalKg <= anchor.maxKg) || anchorLibrary[anchorLibrary.length - 1]
}
