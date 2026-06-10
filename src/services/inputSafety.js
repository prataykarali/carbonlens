export const MAX_RECEIPT_IMAGE_BYTES = 5 * 1024 * 1024

const allowedReceiptImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const allowedReceiptImageExtensions = /\.(jpe?g|png|webp)$/i

export function validateReceiptFileMeta(file) {
  if (!file) return 'Choose a receipt image first.'

  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '')
  const size = Number(file.size || 0)
  const hasAllowedType = allowedReceiptImageTypes.has(type)
  const hasAllowedExtension = allowedReceiptImageExtensions.test(name)

  if (!hasAllowedType && !hasAllowedExtension) {
    return 'Use a PNG, JPG, or WebP receipt image.'
  }

  if (size <= 0) {
    return 'The receipt image is empty.'
  }

  if (size > MAX_RECEIPT_IMAGE_BYTES) {
    return 'Keep receipt images under 5 MB.'
  }

  return ''
}
