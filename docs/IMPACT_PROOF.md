# CarbonLens Impact Proof

CarbonLens keeps user data local by default. The optional proof layer turns a computed result into a small, Cairo-compatible receipt that can be anchored later without uploading the receipt text, meals, route locations, barcode values, or camera image.

## What Gets Hashed

The frontend builds a canonical payload from:

- app name and proof version
- source label
- total grams CO2e
- Unix timestamp
- sorted category totals in grams

It then creates:

- `proof_id`: SHA-256 of the canonical payload
- `category_fingerprint`: SHA-256 of the sorted category totals
- `proof_felt`: first 31 bytes of `proof_id` as a Starknet-friendly `felt252`
- `category_fingerprint_felt`: first 31 bytes of `category_fingerprint`

## Cairo Calldata

The dashboard exposes the same fields expected by `contracts/carbonlens_impact_proof.cairo`:

```text
record_proof(
  proof_id: felt252,
  total_grams_co2e: u64,
  category_fingerprint: felt252,
  recorded_at: u64
)
```

Only the compact proof values are designed for chain anchoring. The personal context stays in the browser unless the user chooses otherwise.

## Why This Helps

- **Privacy:** no raw meals, receipts, locations, or images go on-chain.
- **Integrity:** the same impact result recreates the same proof ID.
- **Auditability:** a user can prove a dashboard result existed at a time without revealing the full input.
- **Extensibility:** the proof contract is isolated from the main app, so the demo remains fast and secure even when blockchain deployment is skipped.
