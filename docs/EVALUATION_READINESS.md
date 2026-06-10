# CarbonLens 99-Readiness Map

Challenge 3 asks for a Carbon Footprint Awareness Platform that helps individuals **understand, track, and reduce** their footprint through simple actions and personalized insights.

CarbonLens is designed around that loop:

1. **Understand:** convert receipts, barcodes, routes, and meals into CO2e with human-scale comparisons.
2. **Track:** store local history, daily meal logs, targets, moving averages, best days, and anonymous aggregate pulse metrics.
3. **Reduce:** generate a personal 3-day reduction plan with the highest-impact item, target gap, best-day repeat action, and estimated savings.
4. **Verify:** create an optional Cairo-ready proof that anchors only compact hashes and totals, not private user inputs.

## Feature Coverage

| 99-level expectation | CarbonLens implementation |
| --- | --- |
| Multiple input modes | Receipt upload, webcam receipt capture, barcode lookup, manual natural-language input, route planner, daily diet form |
| Carbon tracking over time | Local scan history, food logs, 7-day charts, moving averages, target gaps, best-day detection |
| Goal setting | Daily CO2e target control and over/under target dashboard state |
| Personalized reduction tips | `src/services/reductionPlan.js` generates actions from current impact, history, city, and budget |
| Simple reduction actions | 3-day challenge panel with highest lever, category action, and repeat-best-day instruction |
| Comparison to understandable anchors | `src/data/carbon.js` maps totals to local, visceral comparison anchors |
| Gamified reinforcement | Under-target streak, weekly mirror, best-day replay, active-day pulse |
| Privacy-safe tracking | Browser-local logs plus backend aggregate analytics with hashed random IDs only |
| Optional verification | `src/services/impactProof.js` and `contracts/carbonlens_impact_proof.cairo` support Cairo-compatible proof anchoring |
| Testing evidence | Node tests for carbon, parsing, route math, input safety, proofs, reduction plans; Python tests for backend usage and scraper fallbacks |

## Score-Facing Signals

### Problem Statement Alignment

CarbonLens no longer stops at awareness. It closes the full behavior loop:

- **Understand:** users see item-level impact, category split, and plain-language comparisons.
- **Track:** prior choices become daily reports, history charts, and anonymous usage pulse metrics.
- **Reduce:** the dashboard turns the latest result into a measurable 3-day challenge.
- **Personalize:** advice responds to the user's own items, route, diet, city, target, and historical best day.

### Code Quality

Core logic is split into small, testable modules:

- `src/data/carbon.js`: factor matching, quantity parsing, impact aggregation, comparison anchors
- `src/services/routeMath.js`: coordinate parsing, known places, fallback route distance, route impact
- `src/services/inputSafety.js`: receipt file validation
- `src/services/reductionPlan.js`: personalized action planning
- `src/services/impactProof.js`: canonical proof payloads and Cairo calldata
- `backend/usage.py`: privacy-safe aggregate analytics

### Security

- No frontend provider secrets are required for the submitted build.
- Receipt uploads are constrained to PNG, JPG, and WebP under 5 MB.
- Barcodes are sanitized to numeric strings.
- Usage totals are clamped.
- Server responses include CSP, no-sniff, frame denial, HSTS, referrer, permissions, opener-policy, and cross-domain policy headers.
- Optional proof anchoring stores only compact hashes and totals, never raw meals, receipts, routes, barcode values, names, or camera images.

### Accessibility

- Browser zoom is not blocked.
- A skip link is present.
- Form fields use explicit labels.
- Mode controls expose selected state.
- Decorative videos/images are hidden from assistive tech.
- Charts, maps, proof, usage, and reduction-plan regions have accessible labels.
- Live scan status uses `aria-live`.

### Efficiency

- Vite splits heavy vendor libraries into separate chunks.
- Static assets receive cache headers in the Space server.
- Scraper responses are cached.
- Route math has deterministic fallbacks.
- Non-critical images use lazy loading and async decoding.

## Verification Commands

```bash
npm run check
python3 -m py_compile backend/main.py backend/usage.py backend/scraper.py
```

`npm run check` runs linting, six Node test files, nine Python tests, and a production build.
