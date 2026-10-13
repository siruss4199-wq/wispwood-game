# Vaultwake V5 — Landing Challenge Slice

Baseline: PR #63 head `ca74155d`. This implementation is intentionally separate.

## Intent
The first merge and delivery now stabilize the shore rather than instantly finishing the landing. The first milestone opens the existing Survey Kite, upgrades the world scene and awards loose field parts. The second milestone asks for a **Sight Lens (Wayfinding T3)** and **Split Spanner (Fieldworks T3)** so that the player must use two families before choosing an excavation route.

## Invariants
- Still a six-by-six board with nine free cells at fresh start.
- Same existing route, device, delivery, resource and vault systems.
- Same `vaultwake-v5` key and version 5 schema. Old saves without `landingStep` derive the step from `stage`; no intentional inventory resets.
- Only a successful delivery advances the landing objective.
- A first-stage Survey Kite may produce immediately, and Echo Crucible still requires a breach.

## Validation checklist
- Automated core and policy simulations run all play styles to the vault.
- Chromium and WebKit mobile checks at 360, 390, and 430px verify drag, safe-area scrolling and save persistence.
- Browser screenshots cover fresh landing, survey stage, route choice, later milestone scenes and vault.
- Manual QA: Is the extra two-family objective interesting rather than tedious? Are instructions readable at actual 390px? Is the second milestone worth the extra time?

## Follow-on candidates
Add stronger choice framing, reveal effects tied to each milestone, and measure the median actions to route selection before considering more gating or a second chapter.
