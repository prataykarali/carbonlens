const MAX_PROOF_TOTAL_GRAMS = 100_000_000
const FELT_HEX_LENGTH = 62

function grams(value) {
  return Math.max(0, Math.round(Number(value || 0) * 1000))
}

function normalizeCategoryTotals(categoryTotals = {}) {
  return Object.entries(categoryTotals)
    .map(([category, kg]) => ({
      category: String(category || 'other').toLowerCase().trim() || 'other',
      grams: grams(kg),
    }))
    .filter((row) => row.grams > 0)
    .sort((left, right) => left.category.localeCompare(right.category))
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function toFelt252Hex(hex) {
  return `0x${String(hex).replace(/^0x/i, '').slice(0, FELT_HEX_LENGTH).padStart(1, '0')}`
}

export function buildImpactProofPayload({ impact, source = 'carbonlens-local-session', createdAt = new Date() }) {
  const totalGrams = Math.min(MAX_PROOF_TOTAL_GRAMS, grams(impact?.totalKg))
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt)
  const recordedAt = Math.floor(created.getTime() / 1000)

  return {
    app: 'CarbonLens',
    version: 1,
    source,
    total_grams_co2e: totalGrams,
    recorded_at: Number.isFinite(recordedAt) ? recordedAt : 0,
    categories: normalizeCategoryTotals(impact?.categoryTotals),
  }
}

export async function createImpactProof(options) {
  const payload = buildImpactProofPayload(options)
  const categoryHash = await sha256Hex(canonicalJson(payload.categories))
  const proofHash = await sha256Hex(canonicalJson(payload))

  return {
    ...payload,
    proof_id: proofHash,
    proof_felt: toFelt252Hex(proofHash),
    category_fingerprint: categoryHash,
    category_fingerprint_felt: toFelt252Hex(categoryHash),
    cairo_calldata: [
      toFelt252Hex(proofHash),
      payload.total_grams_co2e,
      toFelt252Hex(categoryHash),
      payload.recorded_at,
    ],
  }
}
