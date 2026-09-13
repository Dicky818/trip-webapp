# TWD display regression findings

Date: 2026-09-13

## Current observations

The supplied screenshot shows the `TRIP / RECOVERY` screen from the published app, meaning the root React error boundary was activated. The current source places that boundary in `src/main.tsx` and renders the recovery card when any render or lazy-load exception escapes the application tree.

A read-only Supabase query found three active, non-deleted trips visible to the authenticated account. All three currently have `base_currency = HKD`; one has 3 expenses, another 93, and another 134. The existing data contains no TWD expenses. Therefore the reported TWD condition is most likely the display-currency preference (`localStorage` key `trip_display_currency`) rather than stored TWD expense rows.

The current analysis page uses `displayCurrency` from localStorage, calls `api.getExchangeRate(base, display)`, then renders `exchangeRate.toFixed(4)` and converted totals. `getExchangeRate` returns an error result when the external exchangerate API fails, while the component currently keeps the previous rate and does not surface a safe fallback. The app should preserve analysis rendering in the base currency and show a non-blocking rate-unavailable notice instead of allowing a render exception.

Read-only production navigation with manually supplied trip ID returned `找不到此行程`; returning to the homepage then loaded the current three visible trips. This suggests the manually supplied route ID did not match the live account/session state and should not be treated as a TWD root cause.

## Safety

No test expenses or database records were inserted or modified. The attached user image was not re-read, per instruction.

## Post-release validation

Release `f2ba0c4` was published to GitHub Pages. The authenticated production homepage loaded successfully without the recovery page and showed the three currently accessible trips: `2027 Sapporo`, `2026 8月 大阪京都`, and `2026 6月京都`, with owner-only share and soft-delete buttons visible. No records were changed during validation.

The remaining user-facing verification is to open an existing trip from the live homepage, enter 04 / SPEND, and select TWD in the display-currency control. The code path now falls back to the trip base currency while showing a non-blocking rate-unavailable message if HKD→TWD cannot be fetched.

## Production spend-page baseline

From the latest release, the authenticated homepage opened the existing `2026 8月 大阪京都` trip and 04 / SPEND loaded its existing data successfully: 134 expenses and an HKD total of 43,374.94. The page showed the analysis tab alongside the expense list; no recovery page appeared at this stage. No expense was edited, deleted, or inserted.

## TWD production verification

On the published `f2ba0c4` release, the live 04 / SPEND analysis rendered the existing HKD data before the currency change. Selecting `TWD` in the display-currency control left the analysis page rendered and kept the table visible; it did not trigger the recovery screen. Because the external HKD→TWD rate request was unavailable in this browser session, the new fallback correctly kept the total labeled `HKD 43,374.94` and showed the base-currency comparison rather than falsely labeling HKD values as TWD. The selector remained on TWD so it can automatically update when a rate becomes available. No database writes were performed.
