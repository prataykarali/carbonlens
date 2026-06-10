import test from 'node:test'
import assert from 'node:assert/strict'

import { MAX_RECEIPT_IMAGE_BYTES, validateReceiptFileMeta } from '../src/services/inputSafety.js'

test('accepts supported receipt image metadata', () => {
  assert.equal(validateReceiptFileMeta({ name: 'receipt.webp', size: 42, type: 'image/webp' }), '')
  assert.equal(validateReceiptFileMeta({ name: 'receipt.jpg', size: 42, type: '' }), '')
})

test('rejects unsupported receipt uploads', () => {
  assert.match(validateReceiptFileMeta(null), /choose/i)
  assert.match(validateReceiptFileMeta({ name: 'receipt.svg', size: 42, type: 'image/svg+xml' }), /PNG, JPG, or WebP/i)
  assert.match(validateReceiptFileMeta({ name: 'receipt.png', size: 0, type: 'image/png' }), /empty/i)
  assert.match(validateReceiptFileMeta({ name: 'receipt.png', size: MAX_RECEIPT_IMAGE_BYTES + 1, type: 'image/png' }), /under 5 MB/i)
})
