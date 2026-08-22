# Trip Navigation Validation — 2026-08-21

The published home page was checked in an authenticated production session after clearing the prior PWA cache. It renders only the two requested trip-entry cards: `2026 8月 大阪京都` and `2026 6月京都`. The former portal hero, next-step grid, travel-support panel, health card, and departure-package card are no longer present before a trip is selected.

The remaining validation is to open a trip and confirm that the relocated 01–09 workspace tool rail is visible and routes to its intended tabs without creating or modifying trip data.

The August Osaka–Kyoto workspace was opened in the same production session. It displays the complete `01 / NOW` through `09 / DEPARTURE` tool rail before the workspace content. The `09 / DEPARTURE` card correctly routes to `tab=info&panel=departure`, opening the existing departure-package readiness section without changing trip data.

After the final production publish, the pre-selection page was rechecked with its PWA cache cleared. It now contains exactly the two requested trip-entry cards and no install prompt, portal hero, support panel, health card, departure card, or numbered workspace tools.

During the sequential-label verification, a remaining hero eyebrow reading `TRIP / WORKSPACE` was identified. It has been replaced with `TRIP / PLAN` so no English WORKSPACE label remains in the selected-trip view.
