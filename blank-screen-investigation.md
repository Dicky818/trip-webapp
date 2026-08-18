# GitHub Pages blank-screen investigation

## Initial observation — 2026-08-18

The GitHub Pages production URL renders the Canvas Ivory background and an empty `#root` region. The automated browser reproduces the user’s screenshot and reports no visible interactive elements. Its browser console contains no captured error at this stage.

The next diagnostic steps are to inspect the delivered HTML and module dependency responses, compare production with the local build, and isolate whether runtime startup, deployment paths, or stale service-worker behavior prevents React from mounting.

## Production bundle and runtime findings

The production document loads the current hashed entry module, CSS, HomePage chunk, Departure Package chunk, and associated dependencies successfully. The active controller is the expected `/trip-webapp/sw.js` service worker; it has no waiting or installing successor. Despite these resources loading, `#root` remains empty and the browser console does not expose a startup exception.

The startup code explicitly registers and updates the service worker whenever the page gains focus or visibility, then forces a full reload on every `controllerchange`. The generated worker already uses `skipWaiting` and `clientsClaim`. This combination is a plausible production-only reload-loop or transient-empty-root cause, particularly across GitHub Pages propagation and cached client versions. The repair will remove the redundant forced reload behavior and add a visible root-level recovery state for any future render exception.

## Repair verification finding

After the repaired bundle was published, an old service worker still served the previous entry asset until its cache was explicitly cleared in the automated browser. The new bundle then rendered the added visible recovery panel instead of a blank root, proving that a real React startup exception is also present. The next step is to capture that boundary error and repair its underlying cause; the fallback remains in place so users will no longer receive a wholly blank page if a future startup failure occurs.

## Root cause and permanent repair

The recovery panel isolated the production exception as `timedToday is not defined`. `deriveTripHealth()` referenced that list only when a trip was live, but the declaration had been omitted during an earlier health-card change. The bug therefore affected signed-in travellers with an active trip and unmounted the authenticated React tree, leaving only the background visible.

The repair restores the `timedToday` derivation from same-day itinerary records and their valid times. The root-level recovery panel is retained, but its temporary raw error-message display has been removed; future unexpected startup errors will be logged locally while users receive clear, non-technical recovery guidance.

## Final validation

The final GitHub Pages build was published from commit `bdc8aac`. After clearing the prior service-worker cache in the automated browser, the authenticated production homepage mounted normally with the active-trip pass, Trip Health card, Departure Package card, six tool entries, travel-support panel, and existing trip cards. The regression test suite now has 31 passing tests, including a live-trip Trip Health test that prevents the missing `timedToday` timing list from recurring.
