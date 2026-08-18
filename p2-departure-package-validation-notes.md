# P2.1 Departure Package validation notes

## Automated verification

On 2026-08-18, `npx vite build` completed successfully and `npx vitest run` completed with **30 passing tests**, including six focused Departure Package tests. The production bundle was then published with `npx gh-pages -d dist`.

## Initial production observation

Immediately after publishing, the GitHub Pages URL was still serving an earlier entry asset (`assets/index-B4Ua6F1t.js`) instead of the newly generated entry asset. GitHub Pages subsequently propagated the new entry asset (`assets/index-BzAqY49G.js`), as confirmed by a no-cache HTTP request and by the remote `gh-pages` branch. The automated browser root remained empty even after unregistering its service worker and clearing its caches, with no captured console error. This means the automated browser could confirm publication but could not render an authenticated production workflow for this release.

The current production entry script returned HTTP 200 when fetched directly from the automated browser. A subsequent attempt to inject temporary browser-side runtime listeners was rejected by the browser execution environment before it could run, so it did not affect the deployed application or any trip data.

## Visual validation status

The authenticated Home and Overview flows cannot be rendered in the local automated browser because the local development origin has no logged-in session. The deployed GitHub Pages instance will be rechecked after its cache/update propagation, including desktop and 393 x 852 iPhone-sized layout checks.
