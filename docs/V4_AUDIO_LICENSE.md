# Wispwood audio provenance

Wispwood V4 does not ship third-party audio recordings.

The sound effects in `v4/audio.mjs` are synthesized at runtime with the browser Web Audio API from oscillator envelopes written specifically for this project. There are no external sound files, samples, music recordings, or attribution requirements.

This avoids third-party licensing risk for commercial web-game distribution. The in-game sound toggle is local-player controlled, and the CrazyGames build also respects the platform `muteAudio` setting.
