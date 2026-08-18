# GitHub Pages blank-screen investigation

## Initial observation — 2026-08-18

The GitHub Pages production URL renders the Canvas Ivory background and an empty `#root` region. The automated browser reproduces the user’s screenshot and reports no visible interactive elements. Its browser console contains no captured error at this stage.

The next diagnostic steps are to inspect the delivered HTML and module dependency responses, compare production with the local build, and isolate whether runtime startup, deployment paths, or stale service-worker behavior prevents React from mounting.

## Production bundle and runtime findings

The production document loads the current hashed entry module, CSS, HomePage chunk, Departure Package chunk, and associated dependencies successfully. The active controller is the expected `/trip-webapp/sw.js` service worker; it has no waiting or installing successor. Despite these resources loading, `#root` remains empty and the browser console does not expose a startup exception.

The startup code explicitly registers and updates the service worker whenever the page gains focus or visibility, then forces a full reload on every `controllerchange`. The generated worker already uses `skipWaiting` and `clientsClaim`. This combination is a plausible production-only reload-loop or transient-empty-root cause, particularly across GitHub Pages propagation and cached client versions. The repair will remove the redundant forced reload behavior and add a visible root-level recovery state for any future render exception.
