# PWA Cache Recovery — 2026-08-23

## Cause

An existing browser could continue to receive the previous 01–09 application shell from an old Service Worker after GitHub Pages had already published the Overview-first 01–10 release. The old worker's navigation fallback could satisfy hash-router navigations with its cached `index.html`, which still referenced the older JavaScript bundle.

## Repair

The current worker retains its versioned asset precache, but has no HTML navigation fallback because the application uses `HashRouter` and does not need it. The explicit registration keeps `updateViaCache: 'none'` and requests an update at application startup. A newly activated worker will therefore fetch the latest GitHub Pages HTML instead of serving an obsolete navigation shell.

## Verification

After the `db32e9d` release was published and a fresh production session was loaded, the selected workspace displayed `01 / OVERVIEW`, cards `02` through `10`, and the dynamic tool count `10`.

## Existing open tabs

An already-open older tab must load the new worker once before it can use the new navigation rule. Opening the current release URL, waiting a few seconds, then reloading once is sufficient; no trip, expense, or receipt data is changed by this refresh.
