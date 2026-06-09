import { buildImpact, demoReceiptItems, estimateItemImpact, parseQuantity, pickAnchor } from '../data/carbon'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'

const receiptPrompt = `
Extract purchasable line items from this receipt image.
Return only valid JSON as:
{"items":[{"name":"item name","quantity":1,"unit":"item"}]}
Use units item, kg, litre, km, or hour. Ignore prices, taxes, totals, store metadata, and payment lines.
`

const manualPrompt = (text) => `
Parse this carbon-relevant natural language input into item rows:
"${text}"
Return only valid JSON as:
{"items":[{"name":"item name","quantity":1,"unit":"item"}]}
Use units item, kg, litre, km, or hour.
`

function extractJson(text) {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced?.[1] || text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return null

  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

async function dataUrlToGeminiPart(dataUrl) {
  const [meta, payload] = dataUrl.split(',')
  const mimeType = meta.match(/data:(.*?);base64/)?.[1] || 'image/jpeg'
  return { inlineData: { mimeType, data: payload } }
}

async function callGemini(parts) {
  if (!GEMINI_KEY) throw new Error('Missing Gemini API key')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    },
  )

  if (!response.ok) throw new Error(`Gemini error ${response.status}`)
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || ''
}

async function callGroq(messages) {
  if (!GROQ_KEY) throw new Error('Missing Groq API key')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) throw new Error(`Groq error ${response.status}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

function parseManualFallback(text) {
  const chunks = text
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

  return items.length ? items : [{ name: text || 'mixed purchase', quantity: 1, unit: 'item' }]
}

export async function parseReceiptImage(dataUrl) {
  try {
    const imagePart = await dataUrlToGeminiPart(dataUrl)
    const text = await callGemini([{ text: receiptPrompt }, imagePart])
    const parsed = extractJson(text)
    if (parsed?.items?.length) return parsed.items
  } catch (error) {
    console.info('Gemini receipt parse fallback:', error.message)
  }

  try {
    const text = await callGroq([
      {
        role: 'user',
        content: [
          { type: 'text', text: receiptPrompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ])
    const parsed = extractJson(text)
    if (parsed?.items?.length) return parsed.items
  } catch (error) {
    console.info('Groq receipt parse fallback:', error.message)
  }

  return demoReceiptItems
}

export async function parseManualInput(text) {
  try {
    const response = await callGemini([{ text: manualPrompt(text) }])
    const parsed = extractJson(response)
    if (parsed?.items?.length) return parsed.items
  } catch (error) {
    console.info('Gemini manual parse fallback:', error.message)
  }

  try {
    const response = await callGroq([{ role: 'user', content: manualPrompt(text) }])
    const parsed = extractJson(response)
    if (parsed?.items?.length) return parsed.items
  } catch (error) {
    console.info('Groq manual parse fallback:', error.message)
  }

  return parseManualFallback(text)
}

export async function lookupBarcode(code) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`)
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

  const impact = estimateItemImpact({ name: categories || `barcode ${code}`, quantity: 1, unit: 'item' })
  return {
    code,
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

  const fallback = {
    anchor,
    line: `${totalKg.toFixed(2)} kg CO2e feels like ${anchor.label}.`,
    nudge:
      totalKg > 2
        ? 'Try one smaller swap on the highest-impact item and keep the rest of the choice intact.'
        : 'This is already a low-friction choice. Keep it in your repeat list.',
  }

  try {
    const prompt = `
You are CarbonLens. Make carbon impact visceral, local, and non-guilty.
City: ${city}
Total: ${totalKg.toFixed(2)} kg CO2e
Suggested anchor: ${anchor.label}
Returning user: ${returning}
Recent daily average: ${recentAverage ? recentAverage.toFixed(2) : 'unknown'} kg
Return only JSON:
{"line":"one human comparison under 16 words","nudge":"one actionable swap under 18 words"}
`
    const text = await callGroq([{ role: 'user', content: prompt }])
    const parsed = extractJson(text)
    if (parsed?.line && parsed?.nudge) return { anchor, ...parsed }
  } catch (error) {
    console.info('Comparison phrase fallback:', error.message)
  }

  return fallback
}

export function makeImpactFromItems(items) {
  return buildImpact(items)
}
