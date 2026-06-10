export function ImpactProofPanel({ impactProof }) {
  if (!impactProof) return null

  return (
    <div className="proof-ledger" role="region" aria-label="Cairo ready impact proof">
      <div>
        <span>Optional Starknet proof</span>
        <strong>Cairo-ready impact receipt</strong>
        <p>Hash the result locally, then anchor only the proof ID, total grams, category fingerprint, and timestamp.</p>
      </div>
      <dl>
        <div><dt>Proof ID</dt><dd>{impactProof.proof_felt.slice(0, 18)}...</dd></div>
        <div><dt>Total</dt><dd>{impactProof.total_grams_co2e.toLocaleString('en-IN')} g CO2e</dd></div>
        <div><dt>Fingerprint</dt><dd>{impactProof.category_fingerprint_felt.slice(0, 18)}...</dd></div>
      </dl>
    </div>
  )
}
