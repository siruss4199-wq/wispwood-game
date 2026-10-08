# CrazyGames Basic Launch readiness — Wispwood V4

This build follows the current CrazyGames two-stage release model.

## Basic Launch target
- Directly enter gameplay; no splash/menu gate.
- No advertisements or rewarded-ad controls.
- Responsive mobile layout plus a compact desktop layout designed for the common 907×510 embedded viewport.
- Initial local payload is kept far below the 20 MB mobile-homepage target and 50 MB Basic Launch ceiling.
- Optional CrazyGames HTML5 v3 SDK entry is provided at `/v4/crazygames.html`.
- The adapter initializes the SDK and emits `gameplayStart()` only when the playable board is ready.
- Standalone `/v4/` remains platform-neutral.

## KPI target for the first launch test
The product target is not revenue during Basic Launch; monetization is disabled there. Optimize:
- gameplay conversion,
- average playtime,
- Day-1 retention,
- first-order completion,
- first-restoration completion,
- board-full frustration / early exits.

## Full Launch only after acceptance
Do not expose ad buttons during Basic Launch. After invitation to Full Launch:
- add CrazyGames SDK ads at natural breaks,
- add optional rewarded rewards that never block core progression,
- add CrazyGames data/cloud-save integration,
- implement required platform settings such as muteAudio when audio ships,
- validate everything in the CrazyGames QA/Preview tool.
