# CarbonLens - Next Iteration TODO

## Step 1: Add back the 3 dedicated Rive fullscreen sections ✅
- Ensure the Rive fullscreen section with 3 cards is present
- Verify section ids/classes match CSS expectations
- Keep the fullscreen styling intact


## Step 2: Async race-condition + stability pass
- Add an operation id / request token to ignore stale async results
- Apply to: receipt upload, camera capture, manual submit, food text submit, barcode lookup, route calculation

## Step 3: Camera/scanner cleanup hardening
- Ensure start/stop flows are symmetrical
- Prevent exceptions when stopping already-stopped streams
- Ensure unmount cleanup stops both streams and ambient audio

## Step 4: Route/impact calculation consistency
- Centralize routeKg/byCategory computation to match impact model expectations
- Ensure totals match category sums

## Step 5: Performance tidy
- Memoize derived values tied to specific inputs
- Avoid unnecessary recomputation in render


