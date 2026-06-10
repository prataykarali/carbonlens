import { buildImpact, demoReceiptItems, estimateItemImpact, parseQuantity, pickAnchor } from '../data/carbon.js'

const MAX_PROMPT_CHARS = 2000
const MAX_DATA_URL_CHARS = 6_000_000
const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,/i

export function sanitizePromptText(text = '') {
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[{}[\]<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PROMPT_CHARS)
}

function validateReceiptDataUrl(dataUrl) {
  if (!dataUrl || dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error('Receipt image is missing or too large')
  }

  if (!DATA_URL_PATTERN.test(String(dataUrl))) {
    throw new Error('Receipt image must be a PNG, JPG, or WebP data URL')
  }
}

function parseManualFallback(text) {
  const safeText = sanitizePromptText(text)
  const chunks = safeText
    .split(/,|\n| and /i)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  const items = chunks.map((chunk) => {
    const quantity = parseQuantity(chunk)
    const cleaned = chunk.replace(/\d+(?:\.\d+)?\s*(kg|g|km|hours?|hrs?|litres?|liters?|l)?/gi, '').trim()
    return {
      name: cleaned || chunk,
      quantity: quantity.quantity,
      unit: quantity.unit,
    }
  })

  return items.length ? items : [{ name: safeText || 'mixed purchase', quantity: 1, unit: 'item' }]
}

export async function parseReceiptImage(dataUrl) {
  validateReceiptDataUrl(dataUrl)
  return demoReceiptItems
}

export async function parseManualInput(text) {
  return parseManualFallback(text)
}

export async function lookupBarcode(code) {
  const safeCode = String(code).replace(/\D/g, '').slice(0, 32)
  if (!safeCode) throw new Error('Barcode is required')

  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${safeCode}.json`)
  if (!response.ok) throw new Error('Open Food Facts lookup failed')
  const data = await response.json()
  if (!data.product) throw new Error('Product not found')

  const product = data.product
  const categories = [
    product.product_name,
    product.generic_name,
    product.categories,
    product.compared_to_category,
  ]
    .filter(Boolean)
    .join(' ')

  const impact = estimateItemImpact({ name: categories || `barcode ${safeCode}`, quantity: 1, unit: 'item' })
  return {
    code: safeCode,
    name: product.product_name || product.generic_name || `Barcode ${code}`,
    brand: product.brands || 'Open Food Facts',
    category: product.compared_to_category || product.categories_tags?.[0] || 'packaged food',
    image: product.image_front_small_url || product.image_url,
    impact,
  }
}

export async function phraseComparison({ totalKg, city = 'Kolkata', returning = false, history = [] }) {
  const anchor = pickAnchor(totalKg)
  const recentAverage =
    history.length > 0 ? history.reduce((sum, entry) => sum + entry.total, 0) / history.length : null
  const trend =
    recentAverage && totalKg < recentAverage
      ? `That is below your recent ${city} average.`
      : returning
        ? 'Start with the largest item and keep the rest simple.'
        : 'One practical swap is enough for the first pass.'

  return {
    anchor,
    line: `${totalKg.toFixed(2)} kg CO2e feels like ${anchor.label}.`,
    nudge:
      totalKg > 2
        ? `Try one smaller swap on the highest-impact item. ${trend}`
        : 'This is already a low-friction choice. Keep it in your repeat list.',
  }
}

export function makeImpactFromItems(items) {
  return buildImpact(items)
}
