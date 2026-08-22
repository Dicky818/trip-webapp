# Production Navigation QA — 2026-08-22

## Scope

This check used the authenticated production site and performed navigation only. No expense, itinerary, trip, receipt, or other record was created or changed.

## Numbered tool cards

All nine cards are rendered from the same `WORKSPACE_TOOLS` collection and therefore share the same card layout: number and eyebrow, icon, title, one-line description, arrow, spacing, border, and responsive grid treatment.

| Card | Verified destination | Result |
|---|---|---|
| 01 / NOW | `tab=itinerary&focus=today` | Passed |
| 02 / PLAN | `tab=itinerary` | Passed |
| 03 / SPEND | `tab=expenses` | Passed |
| 04 / STAY | `tab=info` | Passed |
| 05 / PACK | `tab=packing` | Passed |
| 06 / GUIDE | `tab=ai` | Passed |
| 07 / SUPPORT | `tab=ai` | Passed |
| 08 / OPERATIONS | `tab=itinerary&focus=today` | Passed |
| 09 / DEPARTURE | `tab=info&panel=departure` | Passed |

Cards 07–09 therefore match the **format** of cards 01–06 exactly. Their destinations intentionally reuse the existing supporting content: 07 opens the travel assistant, 08 opens the current-day itinerary lens, and 09 opens the departure-package panel in Overview.

## Home trip cards

The production home page contains exactly two entry cards and both use the same new format: trip status, `HKD` currency, date range, day count, completion state, and a `繼續規劃` call to action. Both cards opened their distinct trip routes successfully without a write action.

| Displayed card | Route result | Observation |
|---|---|---|
| `2026 8月 大阪京都` | Opened successfully | Matches the requested name. |
| `2026 6月京都` | Opened successfully | The live data says **Kyoto**, not **Tokyo**. This needs user confirmation before any trip-name change. |
